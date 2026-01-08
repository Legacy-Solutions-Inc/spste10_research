import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface AlertStatus {
  status: "pending" | "accepted" | "rejected" | "canceled" | "completed";
  hasResponder: boolean;
  responseStatus?: "pending" | "accepted" | "rejected" | "in_progress" | "completed";
}

export function useCheckAlertStatus(alertId: string | null, enabled: boolean = true) {
  const [status, setStatus] = useState<AlertStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    if (!alertId || !isSupabaseConfigured()) {
      return;
    }

    setLoading(true);
    try {
      // Check alert status and responder assignments
      const [alertResult, assignmentResult] = await Promise.all([
        supabase!
          .from("alerts")
          .select("status")
          .eq("id", alertId)
          .single(),
        supabase!
          .from("responder_assignments")
          .select("response_status")
          .eq("alert_id", alertId)
          .limit(1)
          .maybeSingle(),
      ]);

      if (alertResult.error) {
        setError(alertResult.error.message);
        return;
      }

      const alertStatus = alertResult.data?.status || "pending";
      const hasResponder = !!assignmentResult.data;
      const responseStatus = assignmentResult.data?.response_status;

      const currentStatus: AlertStatus = {
        status: alertStatus as any,
        hasResponder,
        responseStatus: responseStatus as any,
      };

      setStatus(currentStatus);
      setError(null);

      // Stop polling if alert is accepted, rejected, canceled, or completed
      if (
        alertStatus === "accepted" ||
        alertStatus === "rejected" ||
        alertStatus === "canceled" ||
        alertStatus === "completed"
      ) {
        stopPolling();
      }
    } catch (err) {
      console.error("Check alert status error:", err);
      setError("Failed to check alert status");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (!enabled || !alertId) return;

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      checkStatus();
    }, 2000);

    // Timeout after 60 seconds
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setError("No response received. Please try again.");
    }, 60000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled && alertId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, alertId]);

  return {
    status,
    loading,
    error,
    checkStatus,
    stopPolling,
  };
}

