import { View, Text } from "react-native";

export function SupabaseWarning() {
  return (
    <View className="mb-6 p-4 bg-yellow-50 rounded-lg">
      <Text className="text-sm font-semibold text-yellow-800">
        ⚠️ Supabase not configured
      </Text>
      <Text className="text-xs text-yellow-700 mt-1">
        Authentication features are disabled
      </Text>
    </View>
  );
}

