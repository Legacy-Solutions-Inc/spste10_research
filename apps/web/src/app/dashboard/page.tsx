import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "AGAP - Dashboard",
  description: "AGAP Responder Dashboard",
};

export default async function DashboardPage() {
  // const supabase = createClient();
  // const {
  //   data: { session },
  // } = await supabase.auth.getSession();

  // if (!session) {
  //   redirect("/");
  // }

  return <DashboardClient />;
}
