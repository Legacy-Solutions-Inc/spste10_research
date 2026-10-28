import { useState } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth, hasMobileAccess, denyMobileAccess } from "@/lib/auth";

export function useLogin() {
  const { admit } = useAuth();
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }

    if (!supabaseAvailable) {
      Alert.alert(
        "Configuration Error",
        "Supabase is not configured. Please check your environment variables."
      );
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
        return false;
      }

      if (data.session) {
        // Block responder and admin roles from mobile app
        if (!(await hasMobileAccess(data.user.id))) {
          await denyMobileAccess();
          return false;
        }

        // The navigator switches to Home once the user is admitted
        admit(data.user.id);
        return true;
      }
      return false;
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      console.error("Login error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, supabaseAvailable };
}
