import { useState } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useCancelAlert() {
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const cancelAlert = async (alertId: string) => {
    if (!supabaseAvailable) {
      Alert.alert(
        "Configuration Error",
        "Supabase is not configured. Please check your environment variables."
      );
      return false;
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase!.auth.getUser();

    if (userError || !user) {
      Alert.alert("Error", "You must be logged in to cancel an alert.");
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase!
        .from("alerts")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        })
        .eq("id", alertId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Cancel alert error:", error);
        Alert.alert("Error", `Failed to cancel alert: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Cancel alert error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { cancelAlert, loading, supabaseAvailable };
}

