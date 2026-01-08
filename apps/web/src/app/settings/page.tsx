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
    data: { session },
  } = await supabase.auth.getSession();

  // Session is guaranteed by middleware, but TypeScript needs the check
  if (!session?.user) {
    return null;
  }

  // Fetch user profile data from profiles table
  let profile = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    profile = data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    profile = null;
  }

  // Fetch responder profile data if it exists
  let responderProfile = null;
  try {
    const { data } = await supabase
      .from("responder_profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    responderProfile = data;
  } catch (error) {
    // Responder profile may not exist - that's okay
    responderProfile = null;
  }

  // Merge profile and responder profile data
  const mergedData = {
    id: profile?.id,
    full_name: profile?.full_name,
    email: profile?.email || session.user.email,
    municipality: responderProfile?.municipality,
    province: responderProfile?.province,
    office_address: responderProfile?.office_address,
    contact_number: responderProfile?.contact_number,
  };

  return (
    <SettingsClient
      initialData={mergedData}
      userEmail={session.user.email || ""}
    />
  );
}

