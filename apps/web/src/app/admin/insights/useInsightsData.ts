"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabaseBrowser";
import type { AlertRow, ResponderAssignment } from "@/types/incident";
import { chunk, fetchAllRows } from "./queryHelpers";
import { rangeStart, type InsightAssignment, type InsightIncident, type InsightsData, type RangeKey } from "./metrics";

type IncidentRow = Pick<AlertRow, "id" | "status" | "created_at" | "updated_at">;
type AssignmentRow = Pick<
  ResponderAssignment,
  "id" | "alert_id" | "report_id" | "responder_id" | "response_status" | "responded_at"
>;
type ProfileRow = { id: string; full_name: string | null };

async function fetchIncidents(table: "alerts" | "reports", startIso: string | null): Promise<IncidentRow[]> {
  const supabase = createClient();
  return fetchAllRows<IncidentRow>((from, to) => {
    let query = supabase.from(table).select("id, status, created_at, updated_at");
    if (startIso) query = query.gte("created_at", startIso);
    return query.order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, to);
  });
}

async function fetchAssignments(column: "alert_id" | "report_id", ids: string[]): Promise<AssignmentRow[]> {
  const supabase = createClient();
  const batches = await Promise.all(
    chunk(ids).map((idChunk) =>
      fetchAllRows<AssignmentRow>((from, to) =>
        supabase
          .from("responder_assignments")
          .select("id, alert_id, report_id, responder_id, response_status, responded_at")
          .in(column, idChunk)
          .order("id", { ascending: true })
          .range(from, to)
      )
    )
  );
  return batches.flat();
}

async function fetchOfficeNames(ids: string[]): Promise<Record<string, string>> {
  const supabase = createClient();
  const batches = await Promise.all(
    chunk(ids).map(async (idChunk) => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", idChunk);
      if (error) throw new Error(error.message);
      return (data ?? []) as ProfileRow[];
    })
  );
  const names: Record<string, string> = {};
  for (const profile of batches.flat()) {
    if (profile.full_name) names[profile.id] = profile.full_name;
  }
  return names;
}

async function fetchInsights(range: RangeKey): Promise<InsightsData> {
  const fetchedAt = Date.now();
  const start = rangeStart(range, new Date(fetchedAt));
  const startIso = start ? start.toISOString() : null;

  const [alertRows, reportRows] = await Promise.all([
    fetchIncidents("alerts", startIso),
    fetchIncidents("reports", startIso),
  ]);

  const [alertAssignments, reportAssignments] = await Promise.all([
    fetchAssignments("alert_id", alertRows.map((row) => row.id)),
    fetchAssignments("report_id", reportRows.map((row) => row.id)),
  ]);

  const assignmentRows = [...alertAssignments, ...reportAssignments];
  const officeNames = await fetchOfficeNames(Array.from(new Set(assignmentRows.map((row) => row.responder_id))));

  const toIncident =
    (kind: InsightIncident["kind"]) =>
    (row: IncidentRow): InsightIncident => ({
      id: row.id,
      kind,
      status: row.status,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    });

  const assignments: InsightAssignment[] = [];
  for (const row of assignmentRows) {
    const incidentId = row.alert_id ?? row.report_id;
    if (!incidentId) continue;
    assignments.push({
      incidentId,
      responderId: row.responder_id,
      responseStatus: row.response_status,
      respondedAt: row.responded_at ? new Date(row.responded_at).getTime() : null,
    });
  }

  return {
    range,
    fetchedAt,
    incidents: [...alertRows.map(toIncident("alert")), ...reportRows.map(toIncident("report"))],
    assignments,
    officeNames,
  };
}

export type InsightsStatus = "loading" | "ready" | "error";

/**
 * Loads everything the Insights page needs for one range. Switching ranges keeps the
 * previous numbers on screen (dimmed, `refreshing`) until the new ones arrive.
 */
export function useInsightsData(range: RangeKey) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [status, setStatus] = useState<InsightsStatus>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const latestLoad = useRef(0);
  const dataRef = useRef<InsightsData | null>(null);

  const load = useCallback(async (target: RangeKey) => {
    const loadId = ++latestLoad.current;
    const shown = dataRef.current;
    if (shown) setRefreshing(true);
    else setStatus("loading");

    try {
      const next = await fetchInsights(target);
      if (loadId !== latestLoad.current) return;
      dataRef.current = next;
      setData(next);
      setStatus("ready");
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      console.error("Error loading insights:", err);
      if (shown && shown.range === target) {
        // A manual refresh failed: the numbers on screen are still for this range
        toast({
          title: "Couldn't refresh insights",
          description: "Showing the last loaded numbers. Check your connection and try again.",
          variant: "error",
        });
      } else {
        dataRef.current = null;
        setData(null);
        setStatus("error");
      }
    } finally {
      if (loadId === latestLoad.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const reload = useCallback(() => load(range), [load, range]);

  return { data, status, refreshing, reload };
}
