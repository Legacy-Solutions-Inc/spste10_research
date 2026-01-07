import { View, Text, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";

type HistoryNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "History"
>;

// Mock data for history reports
const mockReports = [
  {
    id: "1",
    date: new Date("2024-03-07T12:51:00"),
    imageUri: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800",
    latitude: 11.061062,
    longitude: 122.456343,
    locationName: "Poblacion Ilawod, Lambunao, Iloilo",
  },
  {
    id: "2",
    date: new Date("2025-09-03T14:30:00"),
    imageUri: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800",
    latitude: 10.720150,
    longitude: 122.562500,
    locationName: "Jaro, Iloilo City, Iloilo",
  },
];

export function HistoryScreen() {
  const navigation = useNavigation<HistoryNavigation>();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
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

      {/* Report List */}
      <ScrollView className="flex-1">
        {mockReports.map((report) => (
          <Pressable
            key={report.id}
            onPress={() =>
              navigation.navigate("HistoryDetails", {
                imageUri: report.imageUri,
                date: report.date,
                latitude: report.latitude,
                longitude: report.longitude,
                locationName: report.locationName,
              })
            }
            className="border border-gray-200 rounded-xl py-3 px-4 mx-4 my-2 bg-white"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-medium text-black">
                {formatDate(report.date)}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#6B7280"
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

