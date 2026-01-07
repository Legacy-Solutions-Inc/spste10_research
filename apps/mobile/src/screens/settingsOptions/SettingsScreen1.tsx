import { View, Text, TouchableOpacity, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RootStackParamList } from "@/navigation/types";

type Settings1Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Settings1"
>;

export function SettingsScreen1() {
  const navigation = useNavigation<Settings1Navigation>();

  return (
    <View className="flex-1 bg-white pt-20">
      {/* Top Header */}
      <View className="flex-row items-center space-x-4 mt-4 px-4 mb-6">
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="h-12 w-12 rounded-full bg-blue-900 items-center justify-center"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>

        {/* Title */}
        <Text className="text-lg font-bold text-blue-900 flex-1 text-center">
          Settings
        </Text>

        {/* Spacer to balance the layout */}
        <View className="w-10" />
      </View>

      {/* List Options */}
      <View className="mt-6 space-y-4">
        {/* Profile Option */}
        <Pressable
          onPress={() => navigation.navigate("Profile")}
          className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200"
        >
          <Text className="text-base font-medium text-black">Profile</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color="#0b376c"
          />
        </Pressable>

        {/* History Option */}
        <Pressable
          onPress={() => navigation.navigate("History")}
          className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200"
        >
          <Text className="text-base font-medium text-black">History</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color="#0b376c"
          />
        </Pressable>
      </View>

      {/* Logout Button at the bottom */}
      <View className="flex-1 justify-end pb-8 px-4">
        <TouchableOpacity
          onPress={async () => {
            if (isSupabaseConfigured() && supabase) {
              try {
                await supabase.auth.signOut();
                navigation.navigate("Login1");
              } catch (error) {
                Alert.alert("Error", "Failed to logout");
                console.error("Logout error:", error);
              }
            } else {
              // If Supabase is not configured, just navigate to login
              navigation.navigate("Login1");
            }
          }}
          className="bg-blue-900 rounded-full py-3 px-6 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

