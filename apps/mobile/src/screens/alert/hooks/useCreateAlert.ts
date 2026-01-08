import { useState } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface CreateAlertParams {
  latitude: number;
  longitude: number;
  locationName?: string;
}

export function useCreateAlert() {
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const createAlert = async (params: CreateAlertParams) => {
    if (!supabaseAvailable) {
      Alert.alert(
        "Configuration Error",
        "Supabase is not configured. Please check your environment variables."
      );
      return null;
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase!.auth.getUser();

    if (userError || !user) {
      Alert.alert("Error", "You must be logged in to create an alert.");
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase!
        .from("alerts")
        .insert({
          user_id: user.id,
          latitude: params.latitude,
          longitude: params.longitude,
          location_name: params.locationName || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Create alert error:", error);
        Alert.alert("Error", `Failed to create alert: ${error.message}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Create alert error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createAlert, loading, supabaseAvailable };
}

