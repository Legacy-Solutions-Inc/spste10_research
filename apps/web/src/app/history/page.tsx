import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import HistoryClient from "./HistoryClient";

export const metadata = {
  title: "AGAP - History",
  description: "View past emergency incidents",
};

export default async function HistoryPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  return <HistoryClient />;
}

