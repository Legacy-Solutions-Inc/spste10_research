import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabaseBrowser";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

type SubscriptionConfig = {
  /**
   * Postgres event type to listen for (INSERT, UPDATE, DELETE, or *).
   */
  event: PostgresChangeEvent;
  /**
   * Schema name, defaults to "public".
   */
  schema?: string;
  /**
   * Table name to subscribe to.
   */
  table: string;
  /**
   * Optional filter string, e.g. "status=eq.pending".
   * See Supabase Realtime docs for filter syntax.
   */
  filter?: string;
  /**
   * Optional explicit channel name.
   * If omitted, a stable name will be generated from table + event.
   */
  channel?: string;
  /**
   * Optional callback invoked whenever a matching change occurs.
   * The payload is intentionally typed as `any` because the project
   * currently does not have full Supabase-generated types for all tables.
   */
  onChange?: (payload: any) => void;
};

type UseSupabaseSubscriptionOptions = {
  /**
   * Whether the subscription should be active.
   * Defaults to true.
   */
  enabled?: boolean;
};

type UseSupabaseSubscriptionState = {
  /**
   * True once at least one channel has successfully subscribed.
   * This is best-effort and does not guarantee continuous connectivity.
   */
  isSubscribed: boolean;
};

/**
 * Generic hook for setting up Supabase Realtime postgres_changes subscriptions
 * in the browser. It handles channel creation and cleanup for you.
 *
 * Example (list refetch):
 * useSupabaseSubscription(
 *   {
 *     event: "INSERT",
 *     table: "alerts",
 *     filter: "status=eq.pending",
 *     onChange: () => refetch(), // trigger your data fetch
 *   },
 *   { enabled: true }
 * );
 *
 * Example (detail view by id):
 * useSupabaseSubscription(
 *   {
 *     event: "UPDATE",
 *     table: "alerts",
 *     filter: `id=eq.${incidentId}`,
 *     onChange: () => refetch(), // refresh just this record
 *   },
 *   { enabled: !!incidentId }
 * );
 */
export function useSupabaseSubscription(
  config: SubscriptionConfig | SubscriptionConfig[],
  options: UseSupabaseSubscriptionOptions = {}
): UseSupabaseSubscriptionState {
  const { enabled = true } = options;

  // Stabilize the config structure for the effect dependency array
  const configs = useMemo(
    () => (Array.isArray(config) ? config : [config]),
    [config]
  );

  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!enabled || configs.length === 0) {
      return;
    }

    const supabase = createClient();
    const channels: any[] = [];
    let subscribed = false;

    configs.forEach((cfg, index) => {
      const {
        event,
        schema = "public",
        table,
        filter,
        channel,
        onChange,
      } = cfg;

      const channelName =
        channel || `${schema}-${table}-${event.toLowerCase()}-${index}`;

      const ch = supabase
        .channel(channelName)
        // We intentionally keep the payload as `any` because table
        // types are not fully generated yet.
        .on(
          "postgres_changes",
          {
            event,
            schema,
            table,
            filter,
          } as any,
          (payload: any) => {
            if (onChange) {
              onChange(payload);
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            subscribed = true;
            setIsSubscribed(true);
          }
        });

      channels.push(ch);
    });

    return () => {
      channels.forEach((ch) => {
        supabase.removeChannel(ch);
      });
    };
  }, [enabled, configs]);

  return { isSubscribed };
}

