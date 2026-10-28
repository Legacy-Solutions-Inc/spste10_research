"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { useSupabaseSubscription, type SubscriptionConfig } from "./useSupabaseSubscription";
import { buildIncidents, indexAssignments } from "@/lib/incidentQueries";
import type { AlertRow, Incident, ReportRow, ResponderAssignment } from "@/types/incident";
import type { IncidentOutcome } from "@/components/incident/IncidentDetail";

export interface HistoryEntry {
  incident: Incident;
  outcome: IncidentOutcome;
  /** When this office accepted or declined it */
  respondedAt: string | null;
}

function outcomeFor(incident: Incident, assignment: ResponderAssignment): IncidentOutcome {
  if (assignment.response_status === "rejected") return "declined";
  if (assignment.response_status === "completed" || incident.status === "completed") return "resolved";
  if (incident.status === "canceled") return "canceled";
  return "active";
}

/** Everything this responder accepted or declined, newest first. */
export function useFetchHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refetch = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Your session has ended. Sign in again to see your history.");
          return;
        }

        const { data: assignmentsRaw, error: assignmentsError } = await supabase
          .from("responder_assignments")
          .select("*")
          .eq("responder_id", user.id)
          .in("response_status", ["accepted", "rejected", "in_progress", "completed"]);
        if (assignmentsError) throw new Error(assignmentsError.message);

        const assignments = (assignmentsRaw || []) as ResponderAssignment[];
        const byIncident = indexAssignments(assignments);
        const alertIds = assignments.map((a) => a.alert_id).filter((id): id is string => !!id);
        const reportIds = assignments.map((a) => a.report_id).filter((id): id is string => !!id);

        const [alertsRes, reportsRes] = await Promise.all([
          alertIds.length ? supabase.from("alerts").select("*").in("id", alertIds) : Promise.resolve({ data: [] as AlertRow[] }),
          reportIds.length ? supabase.from("reports").select("*").in("id", reportIds) : Promise.resolve({ data: [] as ReportRow[] }),
        ]);

        const built = await buildIncidents(supabase, (alertsRes.data || []) as AlertRow[], (reportsRes.data || []) as ReportRow[], byIncident);

        const next = [...built.alerts, ...built.reports]
          .map((incident) => {
            const assignment = byIncident.get(incident.id)!;
            return {
              incident,
              outcome: outcomeFor(incident, assignment),
              respondedAt: assignment.responded_at,
            };
          })
          .sort((a, b) => new Date(b.incident.created_at).getTime() - new Date(a.incident.created_at).getTime());

        if (!cancelled) {
          setEntries(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading history:", err);
          setError(err instanceof Error ? err.message : "Couldn't load history");
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

  const subscriptions = useMemo<SubscriptionConfig[]>(
    () => [
      { event: "*", table: "responder_assignments", onChange: () => refetch(), channel: "history-assignments" },
      { event: "UPDATE", table: "alerts", onChange: () => refetch(), channel: "history-alerts" },
      { event: "UPDATE", table: "reports", onChange: () => refetch(), channel: "history-reports" },
    ],
    [refetch]
  );
  useSupabaseSubscription(subscriptions, { enabled: true });

  return { entries, loading, error, refetch };
}
