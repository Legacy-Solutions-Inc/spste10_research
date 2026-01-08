import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface ReportStatus {
  status: "pending" | "accepted" | "rejected" | "canceled" | "completed";
  hasResponder: boolean;
  responseStatus?: "pending" | "accepted" | "rejected" | "in_progress" | "completed";
}

export function useCheckReportStatus(reportId: string | null, enabled: boolean = true) {
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    if (!reportId || !isSupabaseConfigured()) {
      return;
    }

    setLoading(true);
    try {
      // Check report status and responder assignments
      const [reportResult, assignmentResult] = await Promise.all([
        supabase!
          .from("reports")
          .select("status")
          .eq("id", reportId)
          .single(),
        supabase!
          .from("responder_assignments")
          .select("response_status")
          .eq("report_id", reportId)
          .limit(1)
          .maybeSingle(),
      ]);

      if (reportResult.error) {
        setError(reportResult.error.message);
        return;
      }

      const reportStatus = reportResult.data?.status || "pending";
      const hasResponder = !!assignmentResult.data;
      const responseStatus = assignmentResult.data?.response_status;

      const currentStatus: ReportStatus = {
        status: reportStatus as any,
        hasResponder,
        responseStatus: responseStatus as any,
      };

      setStatus(currentStatus);
      setError(null);

      // Stop polling if report is accepted, rejected, canceled, or completed
      if (
        reportStatus === "accepted" ||
        reportStatus === "rejected" ||
        reportStatus === "canceled" ||
        reportStatus === "completed"
      ) {
        stopPolling();
      }
    } catch (err) {
      console.error("Check report status error:", err);
      setError("Failed to check report status");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (!enabled || !reportId) return;

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
    if (enabled && reportId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, reportId]);

  return {
    status,
    loading,
    error,
    checkStatus,
    stopPolling,
  };
}

