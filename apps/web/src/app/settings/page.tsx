import type { Metadata } from "next";
import { createClient } from "@/lib/supabaseServer";
import SettingsClient from "./SettingsClient";
import type { SettingsProfile, UserRole } from "./types";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, password, and alert preferences",
};

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  role: UserRole | null;
};

type ResponderProfileRow = {
  municipality: string | null;
  province: string | null;
  office_address: string | null;
  contact_number: string | null;
};

export default async function SettingsPage() {
  // Authentication check is handled by middleware
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // User is guaranteed by middleware, but TypeScript needs the check
  if (!user) {
    return null;
  }

  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }
  const profile = profileRaw as ProfileRow | null;
  const role = profile?.role ?? null;

  // Only responders have office details; admins never get a responder_profiles row
  let responder: ResponderProfileRow | null = null;
  if (role === "responder") {
    const { data, error } = await supabase
      .from("responder_profiles")
      .select("municipality, province, office_address, contact_number")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Error fetching responder profile:", error);
    }
    responder = data as ResponderProfileRow | null;
  }

  const initialData: SettingsProfile = {
    full_name: profile?.full_name ?? null,
    email: profile?.email || user.email || null,
    municipality: responder?.municipality ?? null,
    province: responder?.province ?? null,
    office_address: responder?.office_address ?? null,
    contact_number: responder?.contact_number ?? null,
  };

  return <SettingsClient initialData={initialData} userEmail={user.email || ""} role={role} />;
}
