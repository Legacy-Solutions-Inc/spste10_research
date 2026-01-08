import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "AGAP - Dashboard",
  description: "AGAP Responder Dashboard",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  // Get user role
  // @ts-ignore - Supabase types may not be fully generated
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  // Type assertion for profile data
  type ProfileData = {
    role: string | null;
  } | null;

  const profile = profileRaw as ProfileData;

  // Dashboard is for responders - admins should be redirected to admin page
  // (This is also handled by middleware, but good to have here too)
  if (profile?.role === "admin") {
    redirect("/admin");
  }

  return <DashboardClient />;
}
