import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const metadata = {
  title: "AGAP - Admin Dashboard",
  description: "Admin dashboard for managing responder accounts",
};

export default async function AdminPage() {
  // const supabase = createClient();
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // if (!session) {
  //   redirect("/");
  // }

  // TODO: Check if user is admin
  // For now, we'll allow any authenticated user to access
  // In production, add role-based access control
  // const { data: profile } = await supabase
  //   .from("profiles")
  //   .select("role")
  //   .eq("id", session.user.id)
  //   .single();
  // if (profile?.role !== "admin") {
  //   redirect("/dashboard");
  // }

  return <AdminClient />;
}

