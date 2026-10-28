import { Alert, Linking } from "react-native";
import { supabase } from "@/lib/supabase";
import type { Coords } from "@/lib/location";

export type IncidentKind = "alert" | "report";
export type IncidentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "canceled"
  | "completed";

export const EMERGENCY_HOTLINE = "911";

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
  locationName?: string
): Promise<string> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("You're signed out. Log in again to send an alert.");
  }

  const { data, error } = await client
    .from("alerts")
    .insert({
      user_id: user.id,
      latitude: coords.latitude,
      longitude: coords.longitude,
      location_name: locationName ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Create alert error:", error);
    throw new Error("Your alert didn't go through. Check your connection.");
  }
  return data.id as string;
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
