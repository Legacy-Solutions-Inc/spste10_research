"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";

export interface CurrentProfile {
  id: string;
  email: string | null;
  name: string;
  role: "admin" | "responder" | "user" | null;
  municipality: string | null;
  province: string | null;
}

/** The signed-in account's display info, for chrome like the sidebar. */
export function useCurrentProfile() {
  const [profile, setProfile] = useState<CurrentProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const fallbackName = user.email?.split("@")[0] || "Account";

      const { data: profileRaw } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      const base = profileRaw as { full_name: string | null; role: CurrentProfile["role"] } | null;

      let municipality: string | null = null;
      let province: string | null = null;
      if (base?.role === "responder") {
        const { data: responderRaw } = await supabase
          .from("responder_profiles")
          .select("municipality, province")
          .eq("id", user.id)
          .maybeSingle();
        const responder = responderRaw as { municipality: string | null; province: string | null } | null;
        municipality = responder?.municipality ?? null;
        province = responder?.province ?? null;
      }

      if (!cancelled) {
        setProfile({
          id: user.id,
          email: user.email ?? null,
          name: base?.full_name || fallbackName,
          role: base?.role ?? null,
          municipality,
          province,
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
