import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RootStackParamList } from "@/navigation/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export function useSignUp() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const signUp = async (email: string, password: string, fullName?: string) => {
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

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase!.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert("Sign Up Failed", error.message);
        return false;
      }

      if (data.user) {
        // The trigger automatically creates a profile, now update it with full_name if provided
        if (fullName && fullName.trim()) {
          const { error: profileError } = await supabase!
            .from("profiles")
            .update({ full_name: fullName.trim() })
            .eq("id", data.user.id);

          if (profileError) {
            console.error("Profile update error:", profileError);
            // Don't fail the signup if profile update fails - profile was still created by trigger
            // Log it but continue with success
          }
        }

        // Check if session exists (with email confirmation disabled, Supabase should automatically create a session)
        if (data.session) {
          // User is automatically logged in (email confirmation disabled)
          navigation.replace("Home");
          return true;
        } else {
          // Edge case: no session created (shouldn't happen with email confirmation disabled)
          Alert.alert(
            "Account Created",
            "Your account has been created successfully. Please log in.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("Login2"),
              },
            ]
          );
          return true;
        }
      }
      return false;
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      console.error("Sign up error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { signUp, loading, supabaseAvailable };
}

