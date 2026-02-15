"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { useSupabaseSubscription, SubscriptionConfig } from "./useSupabaseSubscription";
import type { Incident, AlertRow, ReportRow, ResponderAssignment } from "@/types/incident";
import { alertToIncident, reportToIncident } from "@/types/incident";

export function useFetchIncidents(onNewIncident?: (newIncidents: Incident[]) => void) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const previousIncidentIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const fetchIncidents = async () => {
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
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

        // Fetch all user IDs (from both alerts and reports)
        const allUserIds = [
          ...new Set([
            ...(alertsData || []).map((a: AlertRow) => a.user_id),
            ...(reportsData || []).map((r: ReportRow) => r.user_id),
          ]),
        ];

        // Fetch user names from profiles
        const userIdToNameMap = new Map<string, string>();
        if (allUserIds.length > 0) {
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

        // Fetch user profiles (age, blood_type, gender) from user_profiles table
        const userIdToProfileMap = new Map<string, { age?: number; blood_type?: string; gender?: string }>();
        if (allUserIds.length > 0) {
          // @ts-ignore - Supabase types may not be fully generated
          const { data: userProfilesData, error: userProfilesError } = await supabase
            .from("user_profiles")
            .select("id, age, blood_type, gender")
            .in("id", allUserIds);

          if (!userProfilesError && userProfilesData) {
            userProfilesData.forEach((profile: { id: string; age?: number; blood_type?: string; gender?: string }) => {
              userIdToProfileMap.set(profile.id, {
                age: profile.age,
                blood_type: profile.blood_type,
                gender: profile.gender,
              });
            });
          }
        }

        // Convert alerts to incidents
        const alertIncidents: Incident[] = (alertsData || []).map((alert: AlertRow) => {
          const assignment = assignmentsMap.get(alert.id);
          const reporterName = userIdToNameMap.get(alert.user_id);
          const reporterProfile = userIdToProfileMap.get(alert.user_id);
          return alertToIncident(
            alert,
            assignment,
            reporterName,
            reporterProfile?.age,
            reporterProfile?.blood_type,
            reporterProfile?.gender
          );
        });

        // Convert reports to incidents
        const reportIncidents: Incident[] = (reportsData || []).map((report: ReportRow) => {
          const assignment = assignmentsMap.get(report.id);
          const reporterName = userIdToNameMap.get(report.user_id);
          const reporterProfile = userIdToProfileMap.get(report.user_id);
          return reportToIncident(
            report,
            assignment,
            reporterName,
            reporterProfile?.age,
            reporterProfile?.blood_type,
            reporterProfile?.gender
          );
        });

        // Combine and sort by created_at
        const allIncidents = [...alertIncidents, ...reportIncidents].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Detect new incidents (only after initial load)
        if (!isInitialLoadRef.current && onNewIncident) {
          const currentIds = new Set(allIncidents.map(inc => inc.id));
          const newIncidents = allIncidents.filter(inc => !previousIncidentIdsRef.current.has(inc.id));

          if (newIncidents.length > 0) {
            onNewIncident(newIncidents);
          }

          previousIncidentIdsRef.current = currentIds;
        } else if (isInitialLoadRef.current) {
          // Store initial incident IDs
          previousIncidentIdsRef.current = new Set(allIncidents.map(inc => inc.id));
          isInitialLoadRef.current = false;
        }

        setIncidents(allIncidents);
      } catch (err) {
        console.error("Error fetching incidents:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch incidents");
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [refreshTrigger, onNewIncident]);

  // Set up realtime subscriptions for new and updated pending incidents.
  // We only trigger a refetch here; the logic inside fetchIncidents
  // is responsible for detecting new incidents vs initial load and
  // invoking onNewIncident accordingly.
  // Memoize the subscription configuration to prevent unnecessary re-subscriptions
  const subscriptionConfig = useMemo<SubscriptionConfig[]>(() => [
    {
      event: "INSERT",
      table: "alerts",
      filter: "status=eq.pending",
      onChange: () => refetch(),
    },
    {
      event: "UPDATE",
      table: "alerts",
      filter: "status=eq.pending",
      onChange: () => refetch(),
    },
    {
      event: "INSERT",
      table: "reports",
      filter: "status=eq.pending",
      onChange: () => refetch(),
    },
    {
      event: "UPDATE",
      table: "reports",
      filter: "status=eq.pending",
      onChange: () => refetch(),
    },
  ], [refetch]);

  useSupabaseSubscription(subscriptionConfig, { enabled: true });

  // Poll every 5 seconds as a fallback
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { incidents, loading, error, refetch };
}
