import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getSignedUrl, extractFilePath, isStoragePath } from "@/lib/storageUtils";

export interface ProfileData {
  // From profiles table
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  
  // From user_profiles table
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  birthday: string | null; // DATE as string (YYYY-MM-DD)
  age: number | null;
  blood_type: string | null;
  gender: string | null;
}

export function useGetProfile() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseAvailable = isSupabaseConfigured();

  const fetchProfile = async () => {
    if (!supabaseAvailable) {
      setError("Supabase is not configured");
      setLoading(false);
      return;
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase!.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in to view your profile");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch from profiles table
      const { data: profile, error: profileError } = await supabase!
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        setError(`Failed to load profile: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // Fetch from user_profiles table (might not exist yet)
      const { data: userProfile, error: userProfileError } = await supabase!
        .from("user_profiles")
        .select("first_name, last_name, address, birthday, age, blood_type, gender")
        .eq("id", user.id)
        .maybeSingle();

      if (userProfileError && userProfileError.code !== "PGRST116") {
        // PGRST116 is "not found" which is OK for new users
        console.error("User profile fetch error:", userProfileError);
        // Don't set error - user_profiles might not exist yet
      }

      // Get signed URL for avatar if it exists
      let avatarUrl = profile?.avatar_url || null;
      if (avatarUrl) {
        // Only generate signed URLs for valid storage paths
        // Local file paths (file://) will be used directly
        if (isStoragePath(avatarUrl, "avatars")) {
          try {
            const filePath = extractFilePath(avatarUrl, "avatars");
            const signedUrl = await getSignedUrl("avatars", filePath);
            if (signedUrl) {
              avatarUrl = signedUrl;
            }
          } catch (err) {
            console.error("Error getting signed URL for avatar:", err);
            // Continue with original URL if signed URL fails
          }
        }
        // For local file paths, use the original URL directly
      }

      // Merge data from both tables
      const mergedData: ProfileData = {
        full_name: profile?.full_name || null,
        email: profile?.email || user.email || null,
        avatar_url: avatarUrl,
        first_name: userProfile?.first_name || null,
        last_name: userProfile?.last_name || null,
        address: userProfile?.address || null,
        birthday: userProfile?.birthday || null,
        age: userProfile?.age || null,
        blood_type: userProfile?.blood_type || null,
        gender: userProfile?.gender || null,
      };

      setProfileData(mergedData);
    } catch (err) {
      console.error("Fetch profile error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profileData,
    loading,
    error,
    refetch: fetchProfile,
  };
}

