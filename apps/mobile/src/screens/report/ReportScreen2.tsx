import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";

type Report2Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Report2"
>;
type Report2RouteProp = RouteProp<RootStackParamList, "Report2">;

export function ReportScreen2() {
  const navigation = useNavigation<Report2Navigation>();
  const route = useRoute<Report2RouteProp>();
  const { imageUri, latitude, longitude, timestamp, locationName } = route.params;

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleDone = () => {
    // Navigate to ReportScreen3 with all data
    // timestamp is already a string from route params
    navigation.navigate("Report3", {
      imageUri,
      latitude,
      longitude,
      timestamp: typeof timestamp === "string" ? timestamp : timestamp.toISOString(),
      locationName,
    });
  };

  if (!imageUri) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-lg text-gray-700">No image found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-4 bg-blue-900 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-20">
      {/* Image preview with grid overlay */}
      <View className="flex-1 relative mt-10">
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Grid overlay - 3x3 rule of thirds */}
        <View className="absolute inset-0 pointer-events-none">
          {/* Vertical lines */}
          <View
            className="absolute top-0 bottom-0 w-px bg-white/50"
            style={{ left: "33.33%" }}
          />
          <View
            className="absolute top-0 bottom-0 w-px bg-white/50"
            style={{ left: "66.66%" }}
          />

          {/* Horizontal lines */}
          <View
            className="absolute left-0 right-0 h-px bg-white/50"
            style={{ top: "33.33%" }}
          />
          <View
            className="absolute left-0 right-0 h-px bg-white/50"
            style={{ top: "66.66%" }}
          />
        </View>
      </View>

      {/* Bottom buttons */}
      <View className="absolute bottom-8 left-0 right-0 px-6 pb-8 flex-row items-center justify-between">
        {/* Retake button - circular, light blue-grey */}
        <TouchableOpacity
          onPress={handleRetake}
          className="h-14 w-14 rounded-full bg-gray-300 items-center justify-center"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="camera" size={28} color="#0b376c" />
        </TouchableOpacity>

        {/* DONE button - dark blue, rounded rectangular */}
        <TouchableOpacity
          onPress={handleDone}
          className="bg-blue-900 px-8 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">DONE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

