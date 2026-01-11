"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import type { Incident, AlertRow, ReportRow, ResponderAssignment } from "@/types/incident";
import { alertToIncident, reportToIncident } from "@/types/incident";

export function useFetchHistory() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reporterNames, setReporterNames] = useState<Map<string, string>>(new Map());
  const [alertCreatorNames, setAlertCreatorNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
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

        // Fetch responder assignments with accepted or rejected status
        // @ts-ignore - Supabase types may not be fully generated
        const { data: assignmentsDataRaw, error: assignmentsError } = await supabase
          .from("responder_assignments")
          .select("*")
          .eq("responder_id", user.id)
          .in("response_status", ["accepted", "rejected"]);

        if (assignmentsError) {
          console.error("Error fetching assignments:", assignmentsError);
          setError("Failed to fetch assignments");
          setLoading(false);
          return;
        }

        // Type assertion for assignments data
        const assignmentsData = assignmentsDataRaw as ResponderAssignment[] | null;

        if (!assignmentsData || assignmentsData.length === 0) {
          setIncidents([]);
          setLoading(false);
          return;
        }

        // Extract alert_ids and report_ids from assignments
        const alertIds = assignmentsData
          .map((a) => a.alert_id)
          .filter((id): id is string => id !== null);
        const reportIds = assignmentsData
          .map((a) => a.report_id)
          .filter((id): id is string => id !== null);

        // Create a map of assignments by alert_id and report_id
        const assignmentsMap = new Map<string, ResponderAssignment>();
        assignmentsData.forEach((assignment) => {
          if (assignment.alert_id) {
            assignmentsMap.set(assignment.alert_id, assignment);
          }
          if (assignment.report_id) {
            assignmentsMap.set(assignment.report_id, assignment);
          }
        });

        // Fetch alerts if there are any alert_ids
        let alertsData: AlertRow[] = [];
        if (alertIds.length > 0) {
          // @ts-ignore - Supabase types may not be fully generated
          const { data, error: alertsError } = await supabase
            .from("alerts")
            .select("*")
            .in("id", alertIds)
            .order("created_at", { ascending: false });

          if (alertsError) {
            console.error("Error fetching alerts:", alertsError);
          } else {
            alertsData = (data as AlertRow[]) || [];
          }
        }

        // Fetch reports if there are any report_ids
        let reportsData: ReportRow[] = [];
        if (reportIds.length > 0) {
          // @ts-ignore - Supabase types may not be fully generated
          const { data, error: reportsError } = await supabase
            .from("reports")
            .select("*")
            .in("id", reportIds)
            .order("created_at", { ascending: false });

          if (reportsError) {
            console.error("Error fetching reports:", reportsError);
          } else {
            reportsData = (data as ReportRow[]) || [];
          }
        }

        // Fetch all user IDs (from both alerts and reports)
        const allUserIds = [
          ...new Set([
            ...alertsData.map((a) => a.user_id),
            ...reportsData.map((r) => r.user_id),
          ]),
        ];

        // Fetch user names from profiles
        const userIdToNameMap = new Map<string, string>();
        if (allUserIds.length > 0) {
          // @ts-ignore - Supabase types may not be fully generated
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", allUserIds);

          if (!profilesError && profilesData) {
            // Create map: user_id -> full_name
            profilesData.forEach((profile: { id: string; full_name: string | null }) => {
              if (profile.full_name) {
                userIdToNameMap.set(profile.id, profile.full_name);
              }
            });
          }
        }

        // Create map: report_id -> reporter_name
        const reporterNamesMap = new Map<string, string>();
        reportsData.forEach((report) => {
          const reporterName = userIdToNameMap.get(report.user_id);
          if (reporterName) {
            reporterNamesMap.set(report.id, reporterName);
          }
        });

        // Create map: alert_id -> alert_creator_name
        const alertCreatorNamesMap = new Map<string, string>();
        alertsData.forEach((alert) => {
          const creatorName = userIdToNameMap.get(alert.user_id);
          if (creatorName) {
            alertCreatorNamesMap.set(alert.id, creatorName);
          }
        });

        // Convert alerts to incidents
        const alertIncidents: Incident[] = alertsData.map((alert: AlertRow) => {
          const assignment = assignmentsMap.get(alert.id);
          return alertToIncident(alert, assignment);
        });

        // Convert reports to incidents
        const reportIncidents: Incident[] = reportsData.map((report: ReportRow) => {
          const assignment = assignmentsMap.get(report.id);
          return reportToIncident(report, assignment);
        });

        // Combine and sort by created_at descending
        const allIncidents = [...alertIncidents, ...reportIncidents].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setIncidents(allIncidents);
        setReporterNames(reporterNamesMap);
        setAlertCreatorNames(alertCreatorNamesMap);
      } catch (err) {
        console.error("Error fetching history:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [refreshTrigger]);

  const refetch = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return { incidents, reporterNames, alertCreatorNames, loading, error, refetch };
}
