import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import type { IncidentKind, IncidentStatus } from "@/lib/incidents";

export interface LiveIncident {
  status: IncidentStatus;
  createdAt: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  /** When a responder accepted, if one has */
  acceptedAt: string | null;
  /** A responder declined (the incident stays open for others) */
  declined: boolean;
}

const TERMINAL: IncidentStatus[] = ["completed", "canceled", "rejected"];
// Safety net in case a Realtime event is missed (flaky network, backgrounding)
const POLL_MS = 15000;

export function isTerminal(status: IncidentStatus | undefined) {
  return !!status && TERMINAL.includes(status);
}

/**
 * Follows one alert/report live: Realtime for instant updates, a slow poll as a
 * fallback, and a refresh whenever the app returns to the foreground.
 */
export function useLiveIncident(kind: IncidentKind, id: string | undefined) {
  const [incident, setIncident] = useState<LiveIncident | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Poll, Realtime and foreground refreshes can overlap; only the newest
  // request may update state, so the status never flips back
  const requestSeq = useRef(0);

  const table = kind === "alert" ? "alerts" : "reports";
  const assignmentColumn = kind === "alert" ? "alert_id" : "report_id";

  const refresh = useCallback(async () => {
    if (!id || !supabase) return;
    const seq = ++requestSeq.current;

    const [incidentResult, assignmentsResult] = await Promise.all([
      supabase
        .from(table)
        .select("status, created_at, latitude, longitude, location_name")
        .eq("id", id)
        .single(),
      // Empty until the citizen read policy on responder_assignments is applied
      supabase
        .from("responder_assignments")
        .select("response_status, responded_at, assigned_at")
        .eq(assignmentColumn, id),
    ]);

    if (seq !== requestSeq.current) return;

    if (incidentResult.error || !incidentResult.data) {
      setError("Can't reach the server. Retrying…");
      return;
    }

    const assignments = assignmentsResult.data ?? [];
    const accepted = assignments.find((a) =>
      ["accepted", "in_progress", "completed"].includes(a.response_status)
    );

    setIncident({
      status: incidentResult.data.status as IncidentStatus,
      createdAt: incidentResult.data.created_at,
      latitude: incidentResult.data.latitude,
      longitude: incidentResult.data.longitude,
      locationName: incidentResult.data.location_name,
      acceptedAt: accepted ? accepted.responded_at ?? accepted.assigned_at : null,
      declined: assignments.some((a) => a.response_status === "rejected"),
    });
    setError(null);
  }, [id, table, assignmentColumn]);

  const terminal = isTerminal(incident?.status);

  // Initial load + Realtime
  useEffect(() => {
    if (!id || !supabase) return;
    refresh();

    // A unique topic: re-entering the same incident quickly must not attach to
    // the previous channel while it is still being removed
    const channel = supabase
      .channel(`live-${kind}-${id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "responder_assignments",
          filter: `${assignmentColumn}=eq.${id}`,
        },
        () => refresh()
      )
      .subscribe();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      supabase?.removeChannel(channel);
      appStateSubscription.remove();
    };
  }, [id, kind, table, assignmentColumn, refresh]);

  // Fallback poll until the incident is closed
  useEffect(() => {
    if (!id || terminal) return;
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [id, terminal, refresh]);

  return { incident, error, refresh };
}
