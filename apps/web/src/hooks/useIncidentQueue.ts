"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { useSupabaseSubscription, type SubscriptionConfig } from "./useSupabaseSubscription";
import type { Incident, AlertRow, ReportRow, ResponderAssignment } from "@/types/incident";
import { buildIncidents, indexAssignments } from "@/lib/incidentQueries";

const POLL_INTERVAL_MS = 5000;

/**
 * Incoming: Emergency Alerts before Reports, then whoever has waited longest.
 * Nothing gets buried under newer arrivals.
 */
function byPriorityThenWait(a: Incident, b: Incident) {
  if (a.type !== b.type) return a.type === "alert" ? -1 : 1;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function byAcceptedAt(a: Incident, b: Incident) {
  const at = (i: Incident) => new Date(i.assignment?.responded_at || i.assignment?.assigned_at || i.created_at).getTime();
  return at(a) - at(b);
}

/**
 * The responder's working queue.
 *
 * - incoming: pending incidents this responder hasn't declined
 * - active: incidents this responder accepted that aren't resolved or canceled yet
 *
 * Refreshes on Realtime changes, with polling as a fallback.
 */
export function useIncidentQueue(onNewIncidents?: (incidents: Incident[]) => void) {
  const [incoming, setIncoming] = useState<Incident[]>([]);
  const [active, setActive] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const userIdRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNewIncidents);
  onNewRef.current = onNewIncidents;

  const refetch = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();

        if (!userIdRef.current) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("Your session has ended. Sign in again to see incidents.");
            setLoading(false);
            return;
          }
          userIdRef.current = user.id;
        }
        const userId = userIdRef.current;

        const [alertsRes, reportsRes, assignmentsRes] = await Promise.all([
          supabase.from("alerts").select("*").eq("status", "pending"),
          supabase.from("reports").select("*").eq("status", "pending"),
          supabase.from("responder_assignments").select("*").eq("responder_id", userId),
        ]);

        if (alertsRes.error && reportsRes.error) {
          throw new Error(alertsRes.error.message);
        }

        const assignments = (assignmentsRes.data || []) as ResponderAssignment[];
        const assignmentByIncident = indexAssignments(assignments);

        // Incidents this responder accepted; RLS lets responders read their assigned rows
        const acceptedAlertIds = assignments.filter((a) => a.response_status === "accepted" && a.alert_id).map((a) => a.alert_id!);
        const acceptedReportIds = assignments.filter((a) => a.response_status === "accepted" && a.report_id).map((a) => a.report_id!);

        const [activeAlertsRes, activeReportsRes] = await Promise.all([
          acceptedAlertIds.length
            ? supabase.from("alerts").select("*").in("id", acceptedAlertIds).eq("status", "accepted")
            : Promise.resolve({ data: [] as AlertRow[] }),
          acceptedReportIds.length
            ? supabase.from("reports").select("*").in("id", acceptedReportIds).eq("status", "accepted")
            : Promise.resolve({ data: [] as ReportRow[] }),
        ]);

        const [pending, accepted] = await Promise.all([
          buildIncidents(supabase, (alertsRes.data || []) as AlertRow[], (reportsRes.data || []) as ReportRow[], assignmentByIncident),
          buildIncidents(supabase, (activeAlertsRes.data || []) as AlertRow[], (activeReportsRes.data || []) as ReportRow[], assignmentByIncident),
        ]);

        const nextIncoming = [...pending.alerts, ...pending.reports]
          .filter((incident) => incident.assignmentStatus !== "rejected")
          .sort(byPriorityThenWait);
        const nextActive = [...accepted.alerts, ...accepted.reports].sort(byAcceptedAt);

        if (cancelled) return;

        // Announce arrivals after the first load (initial backlog isn't "new")
        const currentIds = new Set(nextIncoming.map((i) => i.id));
        if (seenIdsRef.current) {
          const arrivals = nextIncoming.filter((i) => !seenIdsRef.current!.has(i.id));
          if (arrivals.length && onNewRef.current) onNewRef.current(arrivals);
          arrivals.forEach((i) => seenIdsRef.current!.add(i.id));
        } else {
          seenIdsRef.current = currentIds;
        }

        setIncoming(nextIncoming);
        setActive(nextActive);
        setError(null);
        setLastUpdated(Date.now());
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading incident queue:", err);
          setError(err instanceof Error ? err.message : "Couldn't load incidents");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const subscriptionConfig = useMemo<SubscriptionConfig[]>(
    () => [
      { event: "*", table: "alerts", onChange: () => refetch() },
      { event: "*", table: "reports", onChange: () => refetch() },
    ],
    [refetch]
  );

  const { isSubscribed } = useSupabaseSubscription(subscriptionConfig, { enabled: true });

  useEffect(() => {
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  /** Optimistically drop an incident from Incoming (after Accept/Decline) until the next refresh confirms. */
  const removeFromIncoming = useCallback((id: string) => {
    setIncoming((list) => list.filter((incident) => incident.id !== id));
  }, []);

  const removeFromActive = useCallback((id: string) => {
    setActive((list) => list.filter((incident) => incident.id !== id));
  }, []);

  return {
    incoming,
    active,
    loading,
    error,
    refetch,
    live: isSubscribed,
    lastUpdated,
    removeFromIncoming,
    removeFromActive,
  };
}
