"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import type { Incident, AlertRow, ReportRow, ResponderAssignment } from "@/types/incident";
import { alertToIncident, reportToIncident } from "@/types/incident";

export function useFetchIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Fetch pending alerts
        // @ts-ignore - Supabase types may not be fully generated
        const { data: alertsData, error: alertsError } = await supabase
          .from("alerts")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (alertsError) {
          console.error("Error fetching alerts:", alertsError);
        }

        // Fetch pending reports
        // @ts-ignore - Supabase types may not be fully generated
        const { data: reportsData, error: reportsError } = await supabase
          .from("reports")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (reportsError) {
          console.error("Error fetching reports:", reportsError);
        }

        // Fetch responder assignments for current user
        // @ts-ignore - Supabase types may not be fully generated
        const { data: assignmentsDataRaw, error: assignmentsError } = await supabase
          .from("responder_assignments")
          .select("*")
          .eq("responder_id", user.id);

        if (assignmentsError) {
          console.error("Error fetching assignments:", assignmentsError);
        }

        // Type assertion for assignments data
        const assignmentsData = assignmentsDataRaw as ResponderAssignment[] | null;

        // Create a map of assignments by alert_id and report_id
        const assignmentsMap = new Map<string, ResponderAssignment>();
        if (assignmentsData) {
          assignmentsData.forEach((assignment) => {
            if (assignment.alert_id) {
              assignmentsMap.set(assignment.alert_id, assignment);
            }
            if (assignment.report_id) {
              assignmentsMap.set(assignment.report_id, assignment);
            }
          });
        }

        // Convert alerts to incidents
        const alertIncidents: Incident[] = (alertsData || []).map((alert: AlertRow) => {
          const assignment = assignmentsMap.get(alert.id);
          return alertToIncident(alert, assignment);
        });

        // Convert reports to incidents
        const reportIncidents: Incident[] = (reportsData || []).map((report: ReportRow) => {
          const assignment = assignmentsMap.get(report.id);
          return reportToIncident(report, assignment);
        });

        // Combine and sort by created_at
        const allIncidents = [...alertIncidents, ...reportIncidents].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setIncidents(allIncidents);
      } catch (err) {
        console.error("Error fetching incidents:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch incidents");
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();

    // Set up realtime subscription for new incidents
    const supabase = createClient();
    const alertsChannel = supabase
      .channel("alerts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
          filter: "status=eq.pending",
        },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    const reportsChannel = supabase
      .channel("reports-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: "status=eq.pending",
        },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(reportsChannel);
    };
  }, [refreshTrigger]);

  const refetch = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return { incidents, loading, error, refetch };
}
