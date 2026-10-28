import { View, Text, ScrollView, Image, TouchableOpacity, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { useGetProfile } from "@/screens/settingsOptions/hooks/useGetProfile";
import { SosHoldButton } from "@/components/SosHoldButton";

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const insets = useSafeAreaInsets();
  const { profileData, loading: loadingProfile } = useGetProfile();

  // Helper function to get display name with priority order
  const getDisplayName = (): string => {
    if (!profileData) return "User";

    // Priority 1: username (full_name from profiles table - set during registration)
    if (profileData.first_name) {
      return profileData.first_name;
    }
    
    // Priority 2: first_name (from user_profiles - set in settings)
    if (profileData.full_name) {
      return profileData.full_name;
    }

    // Priority 3: Email (show part before @)
    if (profileData.email) {
      return profileData.email.split("@")[0];
    }

    // Fallback
    return "User";
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View>
       
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 px-4">
          <View className="flex-row items-center">
            {/* Avatar */}
            <View className="h-20 w-20 rounded-full bg-gray-200 items-center justify-center mr-4 overflow-hidden">
              {profileData?.avatar_url ? (
                <Image
                  source={{ uri: profileData.avatar_url }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons
                  name="account"
                  size={48}
                  color="#9CA3AF"
                />
              )}
            </View>
            
            <View>
              <Text className="text-lg font-semibold text-gray-700">Hello!</Text>
              <Text className="text-3xl font-extrabold text-black">
                {loadingProfile ? "..." : getDisplayName()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings1")}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={35}
              color="#0b376c"
            />
          </TouchableOpacity>
        </View>

        {/* SOS: hold to send */}
        <View className="items-center px-6">
          <Text
            accessibilityRole="header"
            className="text-center text-2xl font-extrabold text-navy"
          >
            Need help now?
          </Text>
          <Text className="mt-2 text-center text-base leading-6 text-ink-muted">
            Hold the SOS button for 2 seconds. Responders will get your alert
            and location.
          </Text>
          <View className="mt-6">
            <SosHoldButton onSend={() => navigation.navigate("AlertLive")} />
          </View>
        </View>

        {/* Report: tap to open the camera */}
        <Pressable
          onPress={() => navigation.navigate("Report1")}
          accessibilityRole="button"
          accessibilityLabel="Report an emergency"
          accessibilityHint="Opens the camera so you can send a photo to responders"
          className="mx-4 mt-10 flex-row items-center rounded-2xl bg-navy p-5 active:bg-navy-dark"
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <MaterialCommunityIcons name="camera" size={26} color="white" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-bold text-white">
              Report an emergency
            </Text>
            <Text className="mt-0.5 text-sm leading-5 text-white/80">
              Saw someone hurt? Send a photo to responders.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color="white" />
        </Pressable>
      </View>
    </ScrollView>
  );
}
