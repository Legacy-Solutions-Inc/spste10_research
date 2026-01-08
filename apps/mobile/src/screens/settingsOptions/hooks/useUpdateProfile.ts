import { useState } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ProfileData } from "./useGetProfile";

interface UpdateProfileParams {
  // Profiles table updates
  full_name?: string;
  email?: string;
  avatar_url?: string;
  
  // User_profiles table updates
  first_name?: string;
  last_name?: string;
  address?: string;
  birthday?: string; // YYYY-MM-DD format
  age?: number | string;
  blood_type?: string;
  gender?: string;
}

export function useUpdateProfile() {
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const updateProfile = async (params: UpdateProfileParams) => {
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
      Alert.alert("Error", "You must be logged in to update your profile.");
      return false;
    }

    setLoading(true);

    try {
      // Prepare profiles table updates
      const profilesUpdate: any = {};
      if (params.full_name !== undefined) profilesUpdate.full_name = params.full_name || null;
      if (params.avatar_url !== undefined) profilesUpdate.avatar_url = params.avatar_url || null;
      // Note: Email updates should be handled separately via auth API

      // Prepare user_profiles table updates
      const userProfilesUpdate: any = {};
      if (params.first_name !== undefined) userProfilesUpdate.first_name = params.first_name || null;
      if (params.last_name !== undefined) userProfilesUpdate.last_name = params.last_name || null;
      if (params.address !== undefined) userProfilesUpdate.address = params.address || null;
      if (params.birthday !== undefined) userProfilesUpdate.birthday = params.birthday || null;
      if (params.age !== undefined) {
        const ageNum = typeof params.age === "string" ? parseInt(params.age, 10) : params.age;
        userProfilesUpdate.age = isNaN(ageNum) ? null : ageNum;
      }
      if (params.blood_type !== undefined) userProfilesUpdate.blood_type = params.blood_type || null;
      if (params.gender !== undefined) userProfilesUpdate.gender = params.gender || null;

      // Update profiles table (if there are updates)
      if (Object.keys(profilesUpdate).length > 0) {
        const { error: profilesError } = await supabase!
          .from("profiles")
          .update(profilesUpdate)
          .eq("id", user.id);

        if (profilesError) {
          console.error("Update profiles error:", profilesError);
          Alert.alert("Error", `Failed to update profile: ${profilesError.message}`);
          setLoading(false);
          return false;
        }
      }

      // Upsert user_profiles table (create if doesn't exist, update if exists)
      if (Object.keys(userProfilesUpdate).length > 0) {
        // First check if record exists
        const { data: existing } = await supabase!
          .from("user_profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (existing) {
          // Update existing record
          const { error: userProfilesError } = await supabase!
            .from("user_profiles")
            .update(userProfilesUpdate)
            .eq("id", user.id);

          if (userProfilesError) {
            console.error("Update user_profiles error:", userProfilesError);
            Alert.alert("Error", `Failed to update profile details: ${userProfilesError.message}`);
            setLoading(false);
            return false;
          }
        } else {
          // Insert new record
          const { error: userProfilesError } = await supabase!
            .from("user_profiles")
            .insert({
              id: user.id,
              ...userProfilesUpdate,
            });

          if (userProfilesError) {
            console.error("Insert user_profiles error:", userProfilesError);
            Alert.alert("Error", `Failed to create profile details: ${userProfilesError.message}`);
            setLoading(false);
            return false;
          }
        }
      }

      // Handle email update separately via auth API (if needed)
      if (params.email && params.email !== user.email) {
        const { error: emailError } = await supabase!.auth.updateUser({
          email: params.email,
        });

        if (emailError) {
          console.error("Update email error:", emailError);
          Alert.alert(
            "Warning",
            `Profile updated but email update failed: ${emailError.message}`
          );
          // Don't return false - profile update succeeded
        }
      }

      Alert.alert("Success", "Profile updated successfully!");
      return true;
    } catch (error) {
      console.error("Update profile error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, supabaseAvailable };
}

