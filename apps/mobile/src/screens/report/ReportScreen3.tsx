import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { useUploadReportImage } from "./hooks/useUploadReportImage";
import { useCreateReport } from "./hooks/useCreateReport";

type Report3Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Report3"
>;
type Report3RouteProp = RouteProp<RootStackParamList, "Report3">;

export function ReportScreen3() {
  const navigation = useNavigation<Report3Navigation>();
  const route = useRoute<Report3RouteProp>();
  const { imageUri, latitude, longitude, timestamp: timestampString, locationName } = route.params;
  const [isSending, setIsSending] = useState(false);
  
  // Convert timestamp string back to Date
  const timestamp = new Date(timestampString);
  
  const { uploadImage, loading: uploadLoading } = useUploadReportImage();
  const { createReport, loading: createLoading } = useCreateReport();

  // Format date and time
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    }) + " " + formatTime(date);
  };

  const handleSend = async () => {
    setIsSending(true);

    try {
      // Create report first without image URL (we'll update it after upload)
      const tempReportData = await createReport({
        latitude,
        longitude,
        locationName,
        imageUrl: "", // Temporary, will update after upload
        description: aiDescription,
      });

      if (!tempReportData) {
        setIsSending(false);
        return;
      }

      // Upload image with report ID
      const imageUrl = await uploadImage(imageUri, tempReportData.id);

      if (!imageUrl) {
        // If upload fails, navigate anyway - the report exists without image
        // In production, you might want to delete the report or show an error
        navigation.navigate("Report4", { reportId: tempReportData.id });
        setIsSending(false);
        return;
      }

      // Update report with image URL
      const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase!
          .from("reports")
          .update({ image_url: imageUrl })
          .eq("id", tempReportData.id);

        if (updateError) {
          console.error("Failed to update report with image URL:", updateError);
          // Continue anyway - report exists
        }
      }
      
      // Navigate to ReportScreen4 with report ID
      navigation.navigate("Report4", { reportId: tempReportData.id });
    } catch (error) {
      console.error("Error sending report:", error);
      setIsSending(false);
    }
  };

  // AI-generated description (placeholder)
  const aiDescription = `The image shows an individual seated inside a vehicle with a visible injury on the right side of the forehead. The wound appears to be open, with a noticeable amount of blood running downward along the temple and side of the face. The bleeding is concentrated around the upper forehead area, indicating a fresh and possibly deep laceration. The surrounding skin appears reddened, suggesting inflammation or irritation. The individual's hand is raised, touching the temple area near the injury, which may indicate pain or discomfort.`;

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Title */}
      <Text className="text-2xl font-bold text-blue-900 text-center mt-20">
        Report
      </Text>

      {/* Report Card */}
      <View className="mx-4 mt-4 mb-6 rounded-2xl border-2 border-blue-200 overflow-hidden">
        {/* Top Row Metadata */}
        <View className="flex-row justify-between px-4 mt-4">
          {/* Left side - Latitude and Longitude */}
          <View>
            <Text className="text-xs font-semibold text-blue-900">
              Latitude {latitude.toFixed(6)}°
            </Text>
            <Text className="text-xs font-semibold text-blue-900 mt-1">
              Longitude {longitude.toFixed(6)}°
            </Text>
          </View>

          {/* Right side - Date and Time */}
          <View className="items-end">
            <Text className="text-xs font-semibold text-blue-900">
              {formatDate(timestamp)}
            </Text>
            <Text className="text-xs font-semibold text-blue-900 mt-1">
              {formatTime(timestamp)}
            </Text>
          </View>
        </View>

        {/* Image Block */}
        <View className="relative mx-4 mt-4 rounded-xl overflow-hidden">
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 300 }}
            resizeMode="cover"
          />

          {/* Map overlay info tag - bottom left */}
          {locationName && (
            <View className="absolute bottom-2 left-2 bg-white/80 rounded p-2 max-w-[60%]">
              <Text className="text-[10px] text-blue-900 font-semibold">
                {locationName}
              </Text>
              <Text className="text-[10px] text-blue-900 mt-0.5">
                Latitude {latitude.toFixed(6)}°
              </Text>
              <Text className="text-[10px] text-blue-900">
                Longitude {longitude.toFixed(6)}°
              </Text>
              <Text className="text-[10px] text-blue-900 mt-0.5">
                {formatTimestamp(timestamp)}
              </Text>
            </View>
          )}
        </View>

        {/* Location Label */}
        {locationName && (
          <Text className="text-sm font-semibold text-blue-900 text-center mt-2 mx-4">
            {locationName}
          </Text>
        )}

        {/* AI-Generated Description Box */}
        <View className="border border-blue-900 rounded-xl p-4 mt-3 mx-4 mb-4">
          <ScrollView nestedScrollEnabled>
            <Text className="text-sm text-gray-800 leading-5">
              {aiDescription}
            </Text>
          </ScrollView>
        </View>
      </View>

      {/* Send Button */}
      <View className="items-center mb-8">
        <TouchableOpacity
          onPress={handleSend}
          disabled={isSending || uploadLoading || createLoading}
          className="bg-blue-900 rounded-full py-3 px-10 shadow-lg"
          activeOpacity={0.8}
        >
          {isSending || uploadLoading || createLoading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-bold text-base ml-2">Sending...</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-base">SEND</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

