import { useState } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useUploadProfileImage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const supabaseAvailable = isSupabaseConfigured();

  const uploadImage = async (imageUri: string) => {
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
      Alert.alert("Error", "You must be logged in to upload an image.");
      return null;
    }

    setLoading(true);
    setProgress(0);

    try {
      // Get file extension from URI
      const fileExt = imageUri.split(".").pop() || "jpg";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      // Determine MIME type
      const mimeType = `image/${fileExt === "jpg" || fileExt === "jpeg" ? "jpeg" : fileExt}`;

      // For React Native, read file as arrayBuffer using XMLHttpRequest
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", imageUri, true);
        xhr.responseType = "arraybuffer";

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Failed to load file: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error loading file"));
        };

        xhr.send();
      });

      // Upload to Supabase Storage (using avatars bucket or create if needed)
      // Note: You may need to create an 'avatars' bucket in Supabase Storage
      const { data, error } = await supabase!.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true, // Replace existing avatar
        });

      if (error) {
        console.error("Upload image error:", error);
        Alert.alert("Error", `Failed to upload image: ${error.message}`);
        return null;
      }

      // Get public URL (or signed URL for private buckets)
      const {
        data: { publicUrl },
      } = supabase!.storage.from("avatars").getPublicUrl(filePath);

      const imageUrl = publicUrl || filePath;

      setProgress(100);
      return imageUrl;
    } catch (error) {
      console.error("Upload image error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
      return null;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return { uploadImage, loading, progress, supabaseAvailable };
}

