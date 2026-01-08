import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { useGetProfile } from "@/screens/settingsOptions/hooks/useGetProfile";

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseAvailable = isSupabaseConfigured();
  const { profileData, loading: loadingProfile } = useGetProfile();

  // Helper function to get display name with priority order
  const getDisplayName = (): string => {
    if (!profileData) return "User";

    // Priority 1: first_name (from user_profiles) - show just first name if present
    if (profileData.first_name) {
      return profileData.first_name;
    }

    // Priority 2: full_name (from profiles table)
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

  useEffect(() => {
    if (!supabaseAvailable) {
      setLoading(false);
      return;
    }

    // Check if Supabase is available
    const checkSupabase = async () => {
      try {
        const result = await supabase!.auth.getSession();
        setSession(result.data?.session || null);
      } catch (err) {
        console.error("Error checking session:", err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSupabase();

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseAvailable]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-3xl font-bold text-gray-900">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="pt-20">
       
        {/* Header */}
        <View className="flex-row items-center justify-between mb-10 px-4">
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
          <TouchableOpacity onPress={() => navigation.navigate("Settings1")}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={35}
              color="#0b376c"
            />
          </TouchableOpacity>
        </View>

        {/* Card 1 */}
        <View className="mt-16 mb-20 px-4">
          <Text className="text-2xl font-extrabold text-[#0b376c] mb-4">
            Are you in an emergency?
          </Text>
          <Text className="text-md leading-6 text-gray-700 mb-6">
            Press this button, your live{"\n"}
            location will be shared to the{"\n"}
            nearest help centers.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            className="mt-2"
            onPress={() => navigation.navigate("Alert")}
          >
            <View className="relative h-20 justify-center">
              <View className="absolute left-0 right-0 h-9 bg-gray-300" />
              <View className="absolute right-6 h-24 w-24 rounded-full bg-[#0b376c] border-[8px] border-gray-200 items-center justify-center">
                <MaterialCommunityIcons
                  name="alert-octagon-outline"
                  size={40}
                  color="white"
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Card 2 */}
        <View className="mb-20 px-4">
          <Text className="text-2xl font-extrabold text-[#0b376c] mb-4">
            Did you witness an emergency?
          </Text>
          <Text className="text-md leading-6 text-gray-700 mb-6">
            Press this button, take a photo of the{"\n"}
            injury, and wait for assistance from{"\n"}
            the nearest help center. Your live{"\n"}
            location will be shared.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            className="mt-2"
            onPress={() => navigation.navigate("Report1")}
          >
            <View className="relative h-20 justify-center">
              <View className="absolute left-0 right-0 h-9 bg-gray-300" />
              <View className="absolute right-6 h-24 w-24 rounded-full bg-[#0b376c] border-[8px] border-gray-200 items-center justify-center">
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={40}
                  color="white"
                />
              </View>
            </View>
          </TouchableOpacity>
          
        </View>
        {/* Footer */}
      <View className="bg-blue-900 h-16 rounded-t-xl items-center justify-center">
        <View className="h-12 w-12 rounded-full bg-white/20 items-center justify-center">
          <MaterialCommunityIcons
            name="reddit"
            size={40}
            color="white"
          />
        </View>
      </View>
      </View>
    </ScrollView>
  );
}
