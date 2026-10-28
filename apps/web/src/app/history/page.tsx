import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import HistoryClient from "./HistoryClient";

export const metadata = {
  title: "History",
  description: "Incidents your office accepted or declined",
};

export default async function HistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <HistoryClient />;
}

