import { supabase } from "@/lib/supabase";
import { currentUserId } from "@/lib/session";

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
] as const;

export interface EmergencyInfo {
  firstName: string;
  lastName: string;
  contactNumber: string;
  /** YYYY-MM-DD */
  birthday: string | null;
  sex: string | null;
  bloodType: string | null;
  address: string;
}

export const EMPTY_EMERGENCY_INFO: EmergencyInfo = {
  firstName: "",
  lastName: "",
  contactNumber: "",
  birthday: null,
  sex: null,
  bloodType: null,
  address: "",
};

/** Whole years since a YYYY-MM-DD birthday */
export function ageFromBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const [year, month, day] = birthday.split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const hadBirthday =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/** Loose check for PH-style numbers: digits with an optional leading + */
export function isValidContactNumber(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return /^\+?\d{10,13}$/.test(digits);
}

// select("*") rather than named columns so the form still loads if a newer
// column (contact_number) hasn't been migrated yet
async function fetchUserProfileRow(userId: string) {
  const { data } = await supabase!
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function loadEmergencyInfo(): Promise<EmergencyInfo> {
  const userId = await currentUserId();
  const row = await fetchUserProfileRow(userId);
  if (!row) return EMPTY_EMERGENCY_INFO;
  const text = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : "");
  return {
    firstName: text("first_name"),
    lastName: text("last_name"),
    contactNumber: text("contact_number"),
    birthday: text("birthday") || null,
    sex: text("gender") || null,
    bloodType: text("blood_type") || null,
    address: text("address"),
  };
}

/** Saves to user_profiles and keeps profiles.full_name (shown to responders) in sync */
export async function saveEmergencyInfo(info: EmergencyInfo) {
  const userId = await currentUserId();
  const fullName = `${info.firstName.trim()} ${info.lastName.trim()}`.trim();

  const { error: userProfileError } = await supabase!.from("user_profiles").upsert({
    id: userId,
    first_name: info.firstName.trim() || null,
    last_name: info.lastName.trim() || null,
    contact_number: info.contactNumber.trim() || null,
    birthday: info.birthday,
    age: ageFromBirthday(info.birthday),
    gender: info.sex,
    blood_type: info.bloodType,
    address: info.address.trim() || null,
  });
  if (userProfileError) {
    console.error("Save emergency info error:", userProfileError);
    throw new Error("Couldn't save your info. Check your connection and try again.");
  }

  if (fullName) {
    const { error: profileError } = await supabase!
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);
    if (profileError) {
      console.error("Save full name error:", profileError);
    }
  }
}

export async function saveAvatarUrl(avatarUrl: string) {
  const userId = await currentUserId();
  const { error } = await supabase!
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
  if (error) {
    throw new Error("Couldn't save your photo. Try again.");
  }
}

export interface VictimSnapshot {
  victim_name: string | null;
  victim_age: number | null;
  victim_sex: string | null;
  victim_blood_type: string | null;
  victim_contact: string | null;
}

/**
 * The citizen's emergency info as it should be copied onto a new alert.
 * Returns null when there's nothing to copy or it can't be loaded.
 */
export async function getVictimSnapshot(): Promise<VictimSnapshot | null> {
  try {
    const userId = await currentUserId();
    const [row, profileResult] = await Promise.all([
      fetchUserProfileRow(userId),
      supabase!.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);
    const text = (key: string) =>
      row && typeof row[key] === "string" && row[key] ? (row[key] as string) : null;

    const name =
      [text("first_name"), text("last_name")].filter(Boolean).join(" ") ||
      profileResult.data?.full_name ||
      null;
    const snapshot: VictimSnapshot = {
      victim_name: name,
      victim_age: ageFromBirthday(text("birthday")) ?? (typeof row?.age === "number" ? row.age : null),
      victim_sex: text("gender"),
      victim_blood_type: text("blood_type"),
      victim_contact: text("contact_number"),
    };
    return Object.values(snapshot).some((value) => value !== null) ? snapshot : null;
  } catch (err) {
    console.log("Victim snapshot unavailable:", err);
    return null;
  }
}
