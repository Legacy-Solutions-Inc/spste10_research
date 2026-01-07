import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";

type HistoryDetailsNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "HistoryDetails"
>;
type HistoryDetailsRouteProp = RouteProp<RootStackParamList, "HistoryDetails">;

export function HistoryDetailsScreen() {
  const navigation = useNavigation<HistoryDetailsNavigation>();
  const route = useRoute<HistoryDetailsRouteProp>();
  const { imageUri, date, latitude, longitude, locationName } = route.params;

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

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-20 pb-4">
        <TouchableOpacity
          onPress={() => navigation.navigate("History")}
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

      {/* Content */}
      <ScrollView className="flex-1">
        {/* Captured Image */}
        <View className="mx-4 mt-4 rounded-xl overflow-hidden">
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 300 }}
            resizeMode="cover"
          />
        </View>

        {/* Details Section */}
        <View className="px-4 mt-4 pb-8">
          {/* Date & Time */}
          <View className="border-l-4 border-blue-900 pl-2 mb-2">
            <Text className="text-sm text-gray-800 leading-5">
              {formatDate(date)} – {formatTime(date)}
            </Text>
          </View>

          {/* Submission Address */}
          <View className="border-l-4 border-blue-900 pl-2 mb-2">
            <Text className="text-sm text-gray-800 leading-5">
              Report submitted at {locationName}
            </Text>
          </View>

          {/* Coordinates */}
          <View className="border-l-4 border-blue-900 pl-2">
            <Text className="text-sm text-gray-800 leading-5">
              Latitude: {latitude.toFixed(6)} Longitude: {longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="bg-blue-900 h-16 rounded-t-xl items-center justify-center">
        <View className="h-12 w-12 rounded-full bg-white/20 items-center justify-center">
          <MaterialCommunityIcons
            name="alert-octagon"
            size={32}
            color="white"
          />
        </View>
      </View>
    </View>
  );
}

