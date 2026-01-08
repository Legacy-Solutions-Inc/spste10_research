import { useState } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useUploadReportImage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const supabaseAvailable = isSupabaseConfigured();

  const uploadImage = async (imageUri: string, reportId: string) => {
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
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${reportId}/${fileName}`;

      // Determine MIME type
      const mimeType = `image/${fileExt === "jpg" || fileExt === "jpeg" ? "jpeg" : fileExt}`;

      // For React Native, read file as base64 using fetch
      // Then convert to ArrayBuffer for upload
      const response = await fetch(imageUri);
      
      // Try to get arrayBuffer directly from response
      let arrayBuffer: ArrayBuffer;
      
      if (typeof response.arrayBuffer === 'function') {
        // Modern browsers and some React Native environments
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Fallback for React Native: read as base64 and convert
        // Use XMLHttpRequest for better React Native compatibility
        arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', imageUri, true);
          xhr.responseType = 'arraybuffer';
          
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Failed to load file: ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error loading file'));
          };
          
          xhr.send();
        });
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase!.storage
        .from("report-images")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        console.error("Upload image error:", error);
        Alert.alert("Error", `Failed to upload image: ${error.message}`);
        return null;
      }

      // For private buckets, store just the file path (not the full URL)
      // The path format: {user_id}/{report_id}/{filename}
      // We'll generate signed URLs when displaying the images
      // Store just the relative path, not the full URL
      const imageUrl = filePath; // Store just the path: user_id/report_id/filename

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

