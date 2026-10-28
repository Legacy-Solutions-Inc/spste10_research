import { View, Text, Pressable, StyleSheet, Alert, Linking } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import colors from "@/theme/colors";

type Report1Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Report1"
>;

export function ReportScreen1() {
  const navigation = useNavigation<Report1Navigation>();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const askedRef = useRef(false);

  useEffect(() => {
    // Ask once on arrival. Android can still report canAskAgain after a
    // refusal, so without this guard it would prompt again immediately
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !askedRef.current
    ) {
      askedRef.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Location is resolved on the review screen, so the shutter fires instantly
  const takePicture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo?.uri) {
        navigation.navigate("Report2", {
          imageUri: photo.uri,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Couldn't take the photo", "Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-base text-white/80">Opening camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <ScreenHeader title="Report" onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-navy-tint">
            <MaterialCommunityIcons
              name="camera-off"
              size={48}
              color={colors.navy.DEFAULT}
            />
          </View>
          <Text
            accessibilityRole="header"
            className="mt-6 text-center text-2xl font-bold text-ink"
          >
            Camera access needed
          </Text>
          <Text className="mt-2 text-center text-base leading-6 text-ink-muted">
            A photo helps responders see what happened before they arrive.
          </Text>
        </View>
        <View className="px-6 pb-4">
          {permission.canAskAgain ? (
            <Button title="Allow camera" size="lg" onPress={requestPermission} />
          ) : (
            <Button
              title="Open Settings"
              size="lg"
              onPress={() => Linking.openSettings()}
            />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Top: back + framing tip */}
      <View
        className="absolute left-4 right-4 flex-row items-center"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          className="h-12 w-12 items-center justify-center rounded-full bg-white active:bg-navy-tint"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={26}
            color={colors.navy.DEFAULT}
          />
        </Pressable>
        <View className="ml-3 flex-1 rounded-2xl bg-black/60 px-4 py-2">
          <Text className="text-sm leading-5 text-white">
            Fit the whole injury or scene in the frame.
          </Text>
        </View>
      </View>

      {/* Shutter */}
      <View
        className="absolute left-0 right-0 items-center"
        style={{ bottom: insets.bottom + 32 }}
      >
        <Pressable
          onPress={takePicture}
          disabled={capturing}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          accessibilityState={{ disabled: capturing, busy: capturing }}
          className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/30 active:bg-white/60"
        >
          <View className="h-14 w-14 rounded-full bg-white" />
        </Pressable>
      </View>
    </View>
  );
}
