import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";

type Report1Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Report1"
>;

export function ReportScreen1() {
  const navigation = useNavigation<Report1Navigation>();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // Request camera permission on mount
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const takePicture = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = 0;
      let longitude = 0;
      let locationName: string | undefined;

      if (status === "granted") {
        try {
          const location = await Location.getCurrentPositionAsync({});
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;

          // Reverse geocode to get location name
          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });
            if (reverseGeocode.length > 0) {
              const addr = reverseGeocode[0];
              locationName = `${addr.street || ""} ${addr.city || ""} ${addr.region || ""}`.trim();
            }
          } catch (e) {
            console.log("Reverse geocoding failed:", e);
          }
        } catch (e) {
          console.log("Location fetch failed:", e);
        }
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        const timestamp = new Date();
        // Navigate to next screen with image URI and location data
        navigation.navigate("Report2", {
          imageUri: photo.uri,
          latitude,
          longitude,
          timestamp,
          locationName,
        });
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to capture photo");
    }
  };

  // Permission denied fallback UI
  if (permission && !permission.granted) {
    return (
      <View className="flex-1 bg-white pt-20 px-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mb-6 w-12 h-12 rounded-full bg-white items-center justify-center"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#0b376c" />
        </TouchableOpacity>

        <View className="flex-1 justify-center items-center">
          <Text className="text-xl font-bold text-blue-900 text-center mb-4">
            Camera Permission Required
          </Text>
          <Text className="text-base text-gray-700 text-center mb-8 px-4">
            Please grant camera permission to take a photo of the injury.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-blue-900 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-bold text-base">
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading state while checking permissions
  if (!permission) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-lg text-gray-700">Loading camera...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black pt-12">
      {/* Top section with back button and instruction */}
      <View className="absolute top-12 left-4 right-4 z-10">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mb-4 w-12 h-12 rounded-full bg-white items-center justify-center"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#0b376c" />
        </TouchableOpacity>

        {/* Instruction text */}
        <View className="flex-row items-start">
          <View className="w-1 h-6 bg-blue-900 mr-3 mt-1" />
          <Text className="text-sm italic text-blue-800 flex-1">
            Please ensure that the entire injury site is clearly visible in the
            image
          </Text>
        </View>
      </View>

      {/* Camera preview */}
      <View className="flex-1 relative">
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
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

      {/* Camera shutter button at bottom */}
      <View className="absolute bottom-8 left-0 right-0 items-center pb-8">
        <TouchableOpacity
          onPress={takePicture}
          className="h-16 w-16 rounded-full bg-blue-900 items-center justify-center"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="camera" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

