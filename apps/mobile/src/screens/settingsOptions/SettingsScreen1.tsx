import { View, Text, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";

type Settings1Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Settings1"
>;

export function SettingsScreen1() {
  const navigation = useNavigation<Settings1Navigation>();

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

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
      <View className="flex-1 justify-end px-4 pb-6">
        <Button
          title="Log out"
          variant="secondary"
          onPress={async () => {
            // The navigator returns to the welcome screen on sign-out
            if (isSupabaseConfigured() && supabase) {
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert("Error", "Failed to log out");
                console.error("Logout error:", error);
              }
            }
          }}
        />
      </View>
    </Screen>
  );
}

