import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getSignedUrl, extractFilePath, isStoragePath } from "@/lib/storageUtils";

export interface HistoryItem {
  incident_type: "alert" | "report";
  id: string;
  user_id: string;
  status: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  image_url: string | null;
  description: string | null;
  incident_date: string; // ISO string
  updated_at: string | null;
  canceled_at: string | null;
}

export function useGetHistory(incidentType?: "alert" | "report") {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseAvailable = isSupabaseConfigured();

  const fetchHistory = async () => {
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
      setError("You must be logged in to view your history");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query the user_history view directly
      let query = supabase!
        .from("user_history")
        .select("*")
        .eq("user_id", user.id)
        .order("incident_date", { ascending: false });

      // Filter by incident type if specified
      if (incidentType) {
        query = query.eq("incident_type", incidentType);
      }

      const { data, error: historyError } = await query;

      if (historyError) {
        console.error("History fetch error:", historyError);
        setError(`Failed to load history: ${historyError.message}`);
        setLoading(false);
        return;
      }

      // Convert image URLs to signed URLs for private storage
      const itemsWithSignedUrls = await Promise.all(
        ((data as HistoryItem[]) || []).map(async (item) => {
          if (item.image_url && item.incident_type === "report") {
            // Only generate signed URLs for valid storage paths
            // Local file paths (file://) will be used directly
            if (isStoragePath(item.image_url, "report-images")) {
              try {
                // Extract file path from URL or use as-is
                const filePath = extractFilePath(item.image_url, "report-images");
                
                // Get signed URL for the image
                const signedUrl = await getSignedUrl("report-images", filePath);
                
                if (signedUrl) {
                  return { ...item, image_url: signedUrl };
                }
              } catch (err) {
                console.error("Error getting signed URL for image:", err);
                // Continue with original URL if signed URL fails
              }
            }
            // For local file paths or if signed URL generation fails,
            // use the original URL (might still exist locally for recent reports)
          }
          return item;
        })
      );

      setHistoryItems(itemsWithSignedUrls);
    } catch (err) {
      console.error("Fetch history error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [incidentType]);

  return {
    historyItems,
    loading,
    error,
    refetch: fetchHistory,
  };
}

