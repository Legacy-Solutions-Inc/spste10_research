import { createClient } from "@/lib/supabaseServer";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "AGAP - Settings",
  description: "Manage your profile and office information",
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

  // Fetch user profile data from profiles table
  type ProfileData = {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;

  type ResponderProfileData = {
    municipality: string | null;
    province: string | null;
    office_address: string | null;
    contact_number: string | null;
  } | null;

  let profile: ProfileData = null;
  try {
    // @ts-ignore - Supabase types may not be fully generated
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data as ProfileData;
  } catch (error) {
    console.error("Error fetching profile:", error);
    profile = null;
  }

  // Fetch responder profile data if it exists
  let responderProfile: ResponderProfileData = null;
  try {
    // @ts-ignore - Supabase types may not be fully generated
    const { data } = await supabase
      .from("responder_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    responderProfile = data as ResponderProfileData;
  } catch (error) {
    // Responder profile may not exist - that's okay
    responderProfile = null;
  }

  // Merge profile and responder profile data
  const mergedData = {
    id: profile?.id,
    full_name: profile?.full_name,
    email: profile?.email || user.email,
    municipality: responderProfile?.municipality,
    province: responderProfile?.province,
    office_address: responderProfile?.office_address,
    contact_number: responderProfile?.contact_number,
  };

  return (
    <SettingsClient
      initialData={mergedData}
      userEmail={user.email || ""}
    />
  );
}

