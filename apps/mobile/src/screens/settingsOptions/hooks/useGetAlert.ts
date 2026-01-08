import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface AlertDetails {
  id: string;
  user_id: string;
  status: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  victim_name: string | null;
  victim_age: number | null;
  victim_blood_type: string | null;
  victim_sex: string | null;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
}

export function useGetAlert(alertId: string | null | undefined) {
  const [alertDetails, setAlertDetails] = useState<AlertDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseAvailable = isSupabaseConfigured();

  const fetchAlert = async () => {
    if (!alertId || !supabaseAvailable) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: alertError } = await supabase!
        .from("alerts")
        .select("*")
        .eq("id", alertId)
        .single();

      if (alertError) {
        setError(`Failed to load alert: ${alertError.message}`);
        setLoading(false);
        return;
      }

      setAlertDetails(data as AlertDetails);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (alertId) {
      fetchAlert();
    }
  }, [alertId]);

  return {
    alertDetails,
    loading,
    error,
    refetch: fetchAlert,
  };
}

