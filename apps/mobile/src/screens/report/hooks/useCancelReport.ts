import { useState } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useCancelReport() {
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const cancelReport = async (reportId: string) => {
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
      Alert.alert("Error", "You must be logged in to cancel a report.");
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase!
        .from("reports")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Cancel report error:", error);
        Alert.alert("Error", `Failed to cancel report: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Cancel report error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { cancelReport, loading, supabaseAvailable };
}

