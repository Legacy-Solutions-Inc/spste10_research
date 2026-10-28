import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertRow, Incident, ReportRow, ResponderAssignment } from "@/types/incident";
import { alertToIncident, reportToIncident } from "@/types/incident";

type ReporterProfile = { age?: number; blood_type?: string; gender?: string };

/**
 * Turns alert/report rows into Incidents, filling in the citizen's name and
 * emergency profile (age, sex, blood type) from profiles / user_profiles.
 */
export async function buildIncidents(
  supabase: SupabaseClient,
  alerts: AlertRow[],
  reports: ReportRow[],
  assignmentByIncident: Map<string, ResponderAssignment>
): Promise<{ alerts: Incident[]; reports: Incident[] }> {
  const userIds = Array.from(new Set([...alerts, ...reports].map((row) => row.user_id)));

  const names = new Map<string, string>();
  const profiles = new Map<string, ReporterProfile>();
  if (userIds.length) {
    const [profilesRes, userProfilesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", userIds),
      supabase.from("user_profiles").select("id, age, blood_type, gender").in("id", userIds),
    ]);
    ((profilesRes.data || []) as { id: string; full_name: string | null }[]).forEach((p) => {
      if (p.full_name) names.set(p.id, p.full_name);
    });
    ((userProfilesRes.data || []) as ({ id: string } & ReporterProfile)[]).forEach((p) => {
      profiles.set(p.id, p);
    });
  }

  return {
    alerts: alerts.map((row) => {
      const p = profiles.get(row.user_id);
      return alertToIncident(row, assignmentByIncident.get(row.id), names.get(row.user_id), p?.age, p?.blood_type, p?.gender);
    }),
    reports: reports.map((row) => {
      const p = profiles.get(row.user_id);
      return reportToIncident(row, assignmentByIncident.get(row.id), names.get(row.user_id), p?.age, p?.blood_type, p?.gender);
    }),
  };
}

export function indexAssignments(assignments: ResponderAssignment[]): Map<string, ResponderAssignment> {
  const map = new Map<string, ResponderAssignment>();
  assignments.forEach((assignment) => {
    const incidentId = assignment.alert_id || assignment.report_id;
    if (incidentId) map.set(incidentId, assignment);
  });
  return map;
}
