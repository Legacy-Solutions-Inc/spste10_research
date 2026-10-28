import { Alert, Linking } from "react-native";
import { supabase } from "@/lib/supabase";
import {
  describeLocation,
  distanceMeters,
  getFreshPosition,
  type Coords,
  type QuickPosition,
} from "@/lib/location";
import type { VictimSnapshot } from "@/lib/profile";

export type IncidentKind = "alert" | "report";
export type IncidentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "canceled"
  | "completed";

export const EMERGENCY_HOTLINE = "911";

/** Plain-language status names shown to citizens */
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  pending: "Finding a responder",
  accepted: "Help on the way",
  completed: "Resolved",
  canceled: "Canceled",
  rejected: "Declined",
};

export function isActiveStatus(status: string) {
  return status === "pending" || status === "accepted";
}

export function callEmergencyHotline() {
  Linking.openURL(`tel:${EMERGENCY_HOTLINE}`).catch(() => {
    Alert.alert(
      "Can't start a call",
      `Dial ${EMERGENCY_HOTLINE} from your phone app.`
    );
  });
}

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

/** Creates a pending alert and returns its id. Throws with a readable message. */
export async function createAlert(
  coords: Coords,
  victim?: VictimSnapshot | null
): Promise<string> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("You're signed out. Log in again to send an alert.");
  }

  const insertAlert = (withVictim: boolean) =>
    client
      .from("alerts")
      .insert({
        user_id: user.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        ...(withVictim ? victim : {}),
        status: "pending",
      })
      .select("id")
      .single();

  let { data, error } = await insertAlert(!!victim);
  if (error && victim) {
    // The emergency info must never stop the alert itself (e.g. a column that
    // isn't migrated yet), so retry with just the essentials
    console.error("Create alert with victim info failed, retrying:", error);
    ({ data, error } = await insertAlert(false));
  }

  if (error || !data) {
    console.error("Create alert error:", error);
    throw new Error("Your alert didn't go through. Check your connection.");
  }
  return data.id as string;
}

interface NewReport {
  coords: Coords;
  locationName?: string;
  /** AI description; null when analysis hasn't finished or failed */
  description: string | null;
  /** The reporter's own chips and note, kept separate from the AI text */
  userNote: string | null;
}

/** Creates a pending report (photo attached afterwards) and returns its id */
export async function createReport(report: NewReport): Promise<string> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("You're signed out. Log in again to send a report.");
  }

  const { data, error } = await client
    .from("reports")
    .insert({
      user_id: user.id,
      latitude: report.coords.latitude,
      longitude: report.coords.longitude,
      location_name: report.locationName ?? null,
      description: report.description,
      user_note: report.userNote,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Create report error:", error);
    throw new Error("Your report didn't go through. Check your connection.");
  }
  return data.id as string;
}

/** Best-effort: attach the citizen's emergency info if it wasn't ready at send time */
export async function attachVictimSnapshot(id: string, victim: VictimSnapshot) {
  const client = requireClient();
  const { error } = await client
    .from("alerts")
    .update(victim)
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    console.error("Attach victim info failed:", error.message);
  }
}

/** Best-effort update of a still-pending report (photo path, late AI text) */
export async function updatePendingReport(
  id: string,
  fields: { image_url?: string; description?: string }
) {
  const client = requireClient();
  const { error } = await client
    .from("reports")
    .update(fields)
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    console.error("Report update failed:", error.message);
  }
}

/**
 * Updates the position of a still-pending incident once a better fix or a place
 * name is available. Best effort: once a responder has accepted, RLS stops the
 * update, which is fine because they already have a position to go to.
 */
export async function refineIncidentLocation(
  kind: IncidentKind,
  id: string,
  update: Partial<Coords> & { locationName?: string }
) {
  const client = requireClient();
  const { error } = await client
    .from(kind === "alert" ? "alerts" : "reports")
    .update({
      ...(update.latitude !== undefined && { latitude: update.latitude }),
      ...(update.longitude !== undefined && { longitude: update.longitude }),
      ...(update.locationName !== undefined && {
        location_name: update.locationName,
      }),
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    console.log("Location refine skipped:", error.message);
  }
}

/** Swap a cached fix for a fresh one if it moved, then attach a place name */
export async function refineIncidentPosition(
  kind: IncidentKind,
  id: string,
  first: QuickPosition,
  knownLocationName?: string
) {
  let best: Coords = { latitude: first.latitude, longitude: first.longitude };
  let moved = false;
  if (first.approximate) {
    const fresh = await getFreshPosition();
    if (fresh && distanceMeters(best, fresh) > 25) {
      best = fresh;
      moved = true;
      await refineIncidentLocation(kind, id, fresh);
    }
  }
  if (knownLocationName && !moved) return;
  const name = await describeLocation(best);
  if (name) {
    await refineIncidentLocation(kind, id, { locationName: name });
  }
}

/**
 * Cancels or completes the user's own incident through close_my_incident, which
 * rejects transitions that aren't allowed instead of silently updating nothing.
 */
export async function closeIncident(
  kind: IncidentKind,
  id: string,
  outcome: "completed" | "canceled",
  reason?: string
): Promise<IncidentStatus> {
  const client = requireClient();
  const { data, error } = await client.rpc("close_my_incident", {
    p_kind: kind,
    p_id: id,
    p_outcome: outcome,
    p_reason: reason ?? null,
  });
  if (error) {
    console.error("Close incident error:", error);
    throw new Error(error.message || "Couldn't update this. Try again.");
  }
  return data as IncidentStatus;
}
