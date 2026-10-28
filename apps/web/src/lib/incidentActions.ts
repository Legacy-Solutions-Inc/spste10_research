"use client";

import { createClient } from "@/lib/supabaseBrowser";
import type { Incident, IncidentStatus, ResponseStatus } from "@/types/incident";

/** Thrown when another office handled the incident first. */
export class IncidentUnavailableError extends Error {
  constructor(public status: IncidentStatus) {
    super(
      status === "accepted"
        ? "Another office already accepted this incident."
        : status === "canceled"
          ? "The citizen canceled this incident."
          : `This incident is already ${status}.`
    );
    this.name = "IncidentUnavailableError";
  }
}

const tableFor = (incident: Pick<Incident, "type">) => (incident.type === "alert" ? "alerts" : "reports");

async function currentUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session has ended. Sign in again.");
  return user.id;
}

/**
 * Accept or decline an incident for the signed-in responder. Returns the assignment id.
 * Accepting flips the incident to 'accepted' (DB trigger), which claims it for this office.
 */
export async function respondToIncident(incident: Incident, response: Extract<ResponseStatus, "accepted" | "rejected">): Promise<string> {
  const supabase = createClient();
  const userId = await currentUserId();

  // Narrow the race with other offices: re-check right before claiming
  const { data: current, error: currentError } = await supabase
    .from(tableFor(incident))
    .select("status")
    .eq("id", incident.id)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  const status = (current as { status: IncidentStatus } | null)?.status;
  if (!status) throw new IncidentUnavailableError("canceled");
  if (status !== "pending") throw new IncidentUnavailableError(status);

  // The DB trigger also stamps accepts; declines are stamped here so History can show response time
  const respondedAt = new Date().toISOString();

  if (incident.assignment) {
    const { error } = await supabase
      .from("responder_assignments")
      // @ts-ignore - Supabase types may not be fully generated
      .update({ response_status: response, responded_at: respondedAt })
      .eq("id", incident.assignment.id)
      .eq("responder_id", userId);
    if (error) throw new Error(error.message);
    return incident.assignment.id;
  }

  const { data, error } = await supabase
    .from("responder_assignments")
    // @ts-ignore - Supabase types may not be fully generated
    .insert({
      responder_id: userId,
      response_status: response,
      responded_at: respondedAt,
      alert_id: incident.type === "alert" ? incident.id : null,
      report_id: incident.type === "report" ? incident.id : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

/** Put a declined incident back in this responder's Incoming queue. */
export async function undoDecline(assignmentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("responder_assignments")
    // @ts-ignore - Supabase types may not be fully generated
    .update({ response_status: "pending", responded_at: null })
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
}

/** Close an accepted incident. The citizen's app shows it as completed. */
export async function resolveIncident(incident: Incident): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(tableFor(incident))
    // @ts-ignore - Supabase types may not be fully generated
    .update({ status: "completed" })
    .eq("id", incident.id)
    .eq("status", "accepted")
    .select("id");
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    // Nothing updated: the citizen closed it, or it was already resolved
    const { data: current } = await supabase.from(tableFor(incident)).select("status").eq("id", incident.id).maybeSingle();
    const status = (current as { status: IncidentStatus } | null)?.status;
    if (status === "completed") return;
    throw new IncidentUnavailableError(status ?? "canceled");
  }
}
