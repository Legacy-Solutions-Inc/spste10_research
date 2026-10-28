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
import { currentUserId } from "@/lib/session";

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

// An insert that hasn't answered by then is treated as failed; retrying with
// the same id is safe (see insertWithId)
const INSERT_TIMEOUT_MS = 15000;
const UNIQUE_VIOLATION = "23505";
// PostgREST: function not in the schema cache, i.e. its migration isn't applied
const MISSING_FUNCTION = "PGRST202";
// Raised by our own SQL functions with a message meant for the user
const RAISED_EXCEPTION = "P0001";

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

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Inserts a row whose id was chosen on the device. If an earlier attempt
 * actually landed (e.g. it timed out on our side), the retry hits the primary
 * key, which counts as success instead of creating a duplicate.
 * Returns the error (without a code on timeout), or null on success.
 */
async function insertWithId(
  table: "alerts" | "reports",
  row: Record<string, unknown> & { id: string }
) {
  const client = requireClient();
  try {
    const { error } = await withTimeout(
      client.from(table).insert(row),
      INSERT_TIMEOUT_MS
    );
    if (error && error.code !== UNIQUE_VIOLATION) return error;
    return null;
  } catch (err) {
    return {
      code: undefined,
      message: err instanceof Error ? err.message : "insert failed",
    };
  }
}

/** Creates a pending alert with the given id. Throws with a readable message. */
export async function createAlert(
  id: string,
  coords: Coords,
  victim?: VictimSnapshot | null
) {
  const essentials = {
    id,
    user_id: await currentUserId(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: "pending",
  };

  let error = await insertWithId(
    "alerts",
    victim ? { ...essentials, ...victim } : essentials
  );
  if (error?.code && victim) {
    // The emergency info must never stop the alert itself (e.g. a column that
    // isn't migrated yet), so retry with just the essentials. Not on a timeout,
    // where retrying the same request would only double the wait
    console.error("Create alert with victim info failed, retrying:", error);
    error = await insertWithId("alerts", essentials);
  }
  if (error) {
    console.error("Create alert error:", error);
    throw new Error("Your alert didn't go through. Check your connection.");
  }
}

interface NewReport {
  coords: Coords;
  locationName?: string;
  /** Storage path of the already-uploaded photo, if the upload worked */
  imagePath: string | null;
  /** AI description; null when analysis hasn't finished or failed */
  description: string | null;
  /** The reporter's own chips and note, kept separate from the AI text */
  userNote: string | null;
}

/** Creates a pending report with the given id. Throws with a readable message. */
export async function createReport(id: string, report: NewReport) {
  const essentials = {
    id,
    user_id: await currentUserId(),
    latitude: report.coords.latitude,
    longitude: report.coords.longitude,
    location_name: report.locationName ?? null,
    image_url: report.imagePath,
    description: report.description,
    status: "pending",
  };

  let error = await insertWithId(
    "reports",
    report.userNote ? { ...essentials, user_note: report.userNote } : essentials
  );
  if (error?.code && report.userNote) {
    // Same rule as alerts: the optional note can't block the report
    console.error("Create report with note failed, retrying:", error);
    error = await insertWithId("reports", essentials);
  }
  if (error) {
    console.error("Create report error:", error);
    throw new Error("Your report didn't go through. Check your connection.");
  }
}

interface OpenIncidentUpdate {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  /** Reports only; only fills an empty description */
  description?: string;
  /** Alerts only; only fills empty fields */
  victim?: VictimSnapshot;
}

/**
 * Best-effort: adds details that arrive after sending (fresh position, place
 * name, AI text, emergency info). Works while the incident is pending or
 * accepted via update_my_open_incident; before that migration is applied it
 * falls back to the pending-only update policy.
 */
export async function updateOpenIncident(
  kind: IncidentKind,
  id: string,
  update: OpenIncidentUpdate
) {
  const client = requireClient();
  const { error } = await client.rpc("update_my_open_incident", {
    p_kind: kind,
    p_id: id,
    p_latitude: update.latitude ?? null,
    p_longitude: update.longitude ?? null,
    p_location_name: update.locationName ?? null,
    p_description: update.description ?? null,
    p_victim_name: update.victim?.victim_name ?? null,
    p_victim_age: update.victim?.victim_age ?? null,
    p_victim_sex: update.victim?.victim_sex ?? null,
    p_victim_blood_type: update.victim?.victim_blood_type ?? null,
    p_victim_contact: update.victim?.victim_contact ?? null,
  });
  if (!error) return;
  if (error.code !== MISSING_FUNCTION) {
    console.error("Incident update failed:", error.message);
    return;
  }

  const fields: Record<string, unknown> = {
    ...(update.latitude !== undefined && {
      latitude: update.latitude,
      longitude: update.longitude,
    }),
    ...(update.locationName !== undefined && {
      location_name: update.locationName,
    }),
    ...(update.description !== undefined && { description: update.description }),
    ...update.victim,
  };
  let query = client
    .from(kind === "alert" ? "alerts" : "reports")
    .update(fields)
    .eq("id", id)
    .eq("status", "pending");
  if (update.description !== undefined) query = query.is("description", null);
  const { error: fallbackError } = await query;
  if (fallbackError) {
    console.log("Incident update skipped:", fallbackError.message);
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
      await updateOpenIncident(kind, id, fresh);
    }
  }
  if (knownLocationName && !moved) return;
  const name = await describeLocation(best);
  if (name) {
    await updateOpenIncident(kind, id, { locationName: name });
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
  if (!error) return data as IncidentStatus;

  // Before the close-out migration, a pending incident can still be canceled
  // through the existing policy; .select() proves a row actually changed
  if (error.code === MISSING_FUNCTION && outcome === "canceled") {
    const { data: rows, error: cancelError } = await client
      .from(kind === "alert" ? "alerts" : "reports")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (!cancelError && rows && rows.length > 0) return "canceled";
  }

  console.error("Close incident error:", error);
  throw new Error(
    error.code === RAISED_EXCEPTION
      ? error.message
      : "Couldn't update this right now. Try again."
  );
}
