import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";

/** Every /admin page checks the role on the server too, so none rely on middleware alone. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  return <>{children}</>;
}
