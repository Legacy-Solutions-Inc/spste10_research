import { View, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { useGetAlert } from "./hooks/useGetAlert";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

type HistoryDetailsNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "HistoryDetails"
>;
type HistoryDetailsRouteProp = RouteProp<RootStackParamList, "HistoryDetails">;

export function HistoryDetailsScreen() {
  const navigation = useNavigation<HistoryDetailsNavigation>();
  const route = useRoute<HistoryDetailsRouteProp>();
  const { 
    imageUri, 
    date: dateParam, 
    latitude, 
    longitude, 
    locationName, 
    description, 
    status,
    incidentType,
    alertId,
  } = route.params;

  // Fetch alert details if this is an alert
  const { alertDetails, loading: loadingAlert } = useGetAlert(
    incidentType === "alert" ? alertId : null
  );

  // Convert date string to Date object if needed
  const date = typeof dateParam === "string" ? new Date(dateParam) : dateParam;

  const isAlert = incidentType === "alert";

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

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "canceled":
        return "bg-gray-100 text-gray-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Details" onBack={() => navigation.goBack()} />

      {/* Content */}
      <ScrollView className="flex-1">
        {/* Image for Reports or Alert Icon for Alerts */}
        <View className="mx-4 mt-4 rounded-xl overflow-hidden bg-gray-100">
          {isAlert ? (
            <View className="w-full h-[300px] items-center justify-center bg-red-50">
              <MaterialCommunityIcons
                name="alert-circle"
                size={120}
                color="#EF4444"
              />
              <Text className="mt-4 text-lg font-bold text-red-800">Emergency Alert</Text>
            </View>
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: 300 }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-[300px] items-center justify-center">
              <MaterialCommunityIcons
                name="image-off"
                size={64}
                color="#9CA3AF"
              />
              <Text className="mt-2 text-gray-500">No image available</Text>
            </View>
          )}
        </View>

        {/* Details Section */}
        <View className="px-4 mt-4 pb-8">
          {/* Status Badge */}
          {status && (
            <View className="mb-4">
              <View className={`self-start px-3 py-1.5 rounded-full ${getStatusColor(status)}`}>
                <Text className="text-sm font-semibold capitalize">
                  Status: {status}
                </Text>
              </View>
            </View>
          )}

          {/* Date & Time */}
          <View className="border-l-4 border-blue-900 pl-2 mb-3">
            <Text className="text-xs text-gray-500 mb-1">Date & Time</Text>
            <Text className="text-sm text-gray-800 leading-5 font-medium">
              {formatDate(date)} – {formatTime(date)}
            </Text>
          </View>

          {/* Submission Address */}
          {locationName && (
            <View className="border-l-4 border-blue-900 pl-2 mb-3">
              <Text className="text-xs text-gray-500 mb-1">Location</Text>
              <Text className="text-sm text-gray-800 leading-5">
                {locationName}
              </Text>
            </View>
          )}

          {/* Coordinates */}
          <View className="border-l-4 border-blue-900 pl-2 mb-3">
            <Text className="text-xs text-gray-500 mb-1">Coordinates</Text>
            <Text className="text-sm text-gray-800 leading-5">
              Latitude: {latitude.toFixed(6)}
            </Text>
            <Text className="text-sm text-gray-800 leading-5">
              Longitude: {longitude.toFixed(6)}
            </Text>
          </View>

          {/* Victim Information for Alerts */}
          {isAlert && loadingAlert ? (
            <View className="border-l-4 border-blue-900 pl-2 mb-3">
              <ActivityIndicator size="small" color="#0b376c" />
              <Text className="text-xs text-gray-500 mt-2">Loading alert details...</Text>
            </View>
          ) : isAlert && alertDetails ? (
            <>
              {alertDetails.victim_name && (
                <View className="border-l-4 border-red-900 pl-2 mb-3">
                  <Text className="text-xs text-gray-500 mb-1">Victim Name</Text>
                  <Text className="text-sm text-gray-800 leading-5 font-medium">
                    {alertDetails.victim_name}
                  </Text>
                </View>
              )}
              {alertDetails.victim_age && (
                <View className="border-l-4 border-red-900 pl-2 mb-3">
                  <Text className="text-xs text-gray-500 mb-1">Age</Text>
                  <Text className="text-sm text-gray-800 leading-5">
                    {alertDetails.victim_age} years old
                  </Text>
                </View>
              )}
              {alertDetails.victim_sex && (
                <View className="border-l-4 border-red-900 pl-2 mb-3">
                  <Text className="text-xs text-gray-500 mb-1">Sex</Text>
                  <Text className="text-sm text-gray-800 leading-5 capitalize">
                    {alertDetails.victim_sex}
                  </Text>
                </View>
              )}
              {alertDetails.victim_blood_type && (
                <View className="border-l-4 border-red-900 pl-2 mb-3">
                  <Text className="text-xs text-gray-500 mb-1">Blood Type</Text>
                  <Text className="text-sm text-gray-800 leading-5 font-medium">
                    {alertDetails.victim_blood_type}
                  </Text>
                </View>
              )}
            </>
          ) : null}

          {/* Description for Reports */}
          {!isAlert && description && (
            <View className="border-l-4 border-blue-900 pl-2 mb-3">
              <Text className="text-xs text-gray-500 mb-1">Description</Text>
              <Text className="text-sm text-gray-800 leading-5">
                {description}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

    </Screen>
  );
}

