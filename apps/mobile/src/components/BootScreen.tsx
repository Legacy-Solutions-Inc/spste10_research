import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

/** Shown while a persisted session is restored on cold start */
export function BootScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-navy">
      <StatusBar style="light" />
      <Text className="text-4xl font-extrabold tracking-[0.35em] text-white">
        AGAP
      </Text>
      <View className="mt-6">
        <ActivityIndicator size="small" color="#ffffff" />
      </View>
    </View>
  );
}
