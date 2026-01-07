import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "AGAP - Settings",
  description: "Manage your profile and office information",
};

export default async function SettingsPage() {
  // const supabase = createClient();
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // if (!session) {
  //   redirect("/");
  // }

  // // Fetch user profile data
  // // Note: If profiles table doesn't exist, this will gracefully return null
  // let profile = null;
  // try {
  //   const { data } = await supabase
  //     .from("profiles")
  //     .select("*")
  //     .eq("id", session.user.id)
  //     .single();
  //   profile = data;
  // } catch (error) {
  //   // Profiles table may not exist yet - that's okay
  //   profile = null;
  // }

  return <SettingsClient initialData={null} userEmail={""} />;
}

