import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { IncidentKind } from "@/lib/incidents";

/** Extra fields not in the history view; all optional so older rows still load */
export interface IncidentDetails {
  victim_name?: string | null;
  victim_age?: number | null;
  victim_sex?: string | null;
  victim_blood_type?: string | null;
  victim_contact?: string | null;
  description?: string | null;
  user_note?: string | null;
  close_reason?: string | null;
}

export function useIncidentDetails(kind: IncidentKind, id: string) {
  const [details, setDetails] = useState<IncidentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    // select("*") so a not-yet-migrated column doesn't fail the whole fetch
    supabase
      .from(kind === "alert" ? "alerts" : "reports")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("Incident details error:", error.message);
        setDetails((data as IncidentDetails) ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, id]);

  return { details, loading };
}
