import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { useGetHistory } from "./hooks/useGetHistory";

type HistoryNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "History"
>;

export function HistoryScreen() {
  const navigation = useNavigation<HistoryNavigation>();
  // Fetch both alerts and reports
  const { historyItems, loading, error } = useGetHistory();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
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
    <View className="flex-1 bg-white pt-20">
      {/* Header */}
      <View className="flex-row items-center px-4 mt-4 mb-6">
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings1")}
          className="h-12 w-12 rounded-full bg-blue-900 items-center justify-center mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-900 flex-1 text-center -ml-14">
          History
        </Text>
      </View>

      {/* History List */}
      <ScrollView className="flex-1">
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#0b376c" />
            <Text className="mt-4 text-gray-600">Loading history...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center px-6 py-20">
            <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
            <Text className="mt-4 text-lg font-bold text-gray-900 text-center">
              Error Loading History
            </Text>
            <Text className="mt-2 text-gray-600 text-center">{error}</Text>
          </View>
        ) : historyItems.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6 py-20">
            <MaterialCommunityIcons name="history" size={64} color="#9CA3AF" />
            <Text className="mt-4 text-lg font-bold text-gray-900 text-center">
              No History Yet
            </Text>
            <Text className="mt-2 text-gray-600 text-center">
              Your incident reports will appear here
            </Text>
          </View>
        ) : (
          historyItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                navigation.navigate("HistoryDetails", {
                  imageUri: item.image_url || "",
                  date: item.incident_date, // Pass ISO string
                  latitude: item.latitude,
                  longitude: item.longitude,
                  locationName: item.location_name || "",
                  description: item.description || "",
                  status: item.status,
                  incidentType: item.incident_type,
                  alertId: item.incident_type === "alert" ? item.id : undefined,
                })
              }
              className="border border-gray-200 rounded-xl mx-4 my-2 bg-white overflow-hidden"
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View className="flex-row items-center p-3">
                {/* Thumbnail Image or Alert Icon */}
                <View className="w-20 h-20 rounded-lg overflow-hidden mr-3 bg-gray-100 items-center justify-center">
                  {item.incident_type === "report" && item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      {item.incident_type === "alert" ? (
                        <MaterialCommunityIcons
                          name="alert-circle"
                          size={40}
                          color="#EF4444"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="image-off"
                          size={32}
                          color="#9CA3AF"
                        />
                      )}
                    </View>
                  )}
                </View>

                {/* Details Section */}
                <View className="flex-1 mr-2">
                  {/* Incident Type Badge and Date */}
                  <View className="flex-row items-center mb-1">
                    <View className={`px-2 py-0.5 rounded mr-2 ${item.incident_type === "alert"
                        ? "bg-red-100"
                        : "bg-blue-100"
                      }`}>
                      <Text className={`text-xs font-semibold capitalize ${item.incident_type === "alert"
                          ? "text-red-800"
                          : "text-blue-800"
                        }`}>
                        {item.incident_type}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-black flex-1">
                      {formatDate(item.incident_date)}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 mb-1">
                    {formatTime(item.incident_date)}
                  </Text>

                  {/* Location */}
                  {item.location_name && (
                    <Text className="text-sm text-gray-700 mb-1" numberOfLines={1}>
                      {item.location_name}
                    </Text>
                  )}
                  <Text className="text-xs text-gray-500 mb-1">
                    {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                  </Text>

                  {/* Status Badge */}
                  <View className="self-start mt-1">
                    <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                      <Text className="text-xs font-semibold capitalize">
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Chevron */}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#6B7280"
                />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

