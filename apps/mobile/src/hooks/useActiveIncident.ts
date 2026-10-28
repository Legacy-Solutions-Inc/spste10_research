import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/lib/supabase";
import type { IncidentKind, IncidentStatus } from "@/lib/incidents";

export interface ActiveIncident {
  kind: IncidentKind;
  id: string;
  status: IncidentStatus;
  createdAt: string;
}

/**
 * The user's most recent open alert or report, refreshed whenever the screen
 * regains focus, so a live incident is always one tap away from Home.
 */
export function useActiveIncident() {
  const [active, setActive] = useState<ActiveIncident | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const latestOpen = (table: "alerts" | "reports") =>
      supabase!
        .from(table)
        .select("id, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const [alertResult, reportResult] = await Promise.all([
      latestOpen("alerts"),
      latestOpen("reports"),
    ]);

    const candidates: ActiveIncident[] = [];
    if (alertResult.data) {
      candidates.push({
        kind: "alert",
        id: alertResult.data.id,
        status: alertResult.data.status,
        createdAt: alertResult.data.created_at,
      });
    }
    if (reportResult.data) {
      candidates.push({
        kind: "report",
        id: reportResult.data.id,
        status: reportResult.data.status,
        createdAt: reportResult.data.created_at,
      });
    }
    candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setActive(candidates[0] ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return active;
}
