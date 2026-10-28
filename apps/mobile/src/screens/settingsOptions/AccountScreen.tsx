import { useState } from "react";
import { View, Text, Pressable, Image, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import colors from "@/theme/colors";
import { useGetProfile } from "./hooks/useGetProfile";

type AccountNavigation = NativeStackNavigationProp<RootStackParamList, "Account">;

function AccountRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      className="flex-row items-center border-b border-line px-4 py-4 active:bg-surface"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-navy-tint">
        <MaterialCommunityIcons name={icon} size={24} color={colors.navy.DEFAULT} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-ink">{title}</Text>
        <Text className="text-sm text-ink-muted">{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={colors.ink.subtle}
      />
    </Pressable>
  );
}

export function AccountScreen() {
  const navigation = useNavigation<AccountNavigation>();
  const { profileData } = useGetProfile();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const name =
    [profileData?.first_name, profileData?.last_name].filter(Boolean).join(" ") ||
    profileData?.full_name ||
    "Your account";

  // The navigator returns to the welcome screen on sign-out
  const logOut = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoggingOut(false);
      setConfirmingLogout(false);
      Alert.alert("Couldn't log out", "Please try again.");
      console.error("Logout error:", error);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Account" onBack={() => navigation.goBack()} />

      <View className="mx-4 mt-2 flex-row items-center rounded-2xl bg-surface p-4">
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white">
          {profileData?.avatar_url ? (
            <Image
              source={{ uri: profileData.avatar_url }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={36}
              color={colors.ink.subtle}
            />
          )}
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-lg font-bold text-ink" numberOfLines={1}>
            {name}
          </Text>
          {profileData?.email && (
            <Text className="text-sm text-ink-muted" numberOfLines={1}>
              {profileData.email}
            </Text>
          )}
        </View>
      </View>

      <View className="mt-4 border-t border-line">
        <AccountRow
          icon="card-account-details-outline"
          title="Emergency info"
          subtitle="Name, contact number, blood type"
          onPress={() => navigation.navigate("Profile")}
        />
        <AccountRow
          icon="history"
          title="History"
          subtitle="Alerts and reports you've sent"
          onPress={() => navigation.navigate("History")}
        />
      </View>

      <View className="flex-1 justify-end px-4 pb-4">
        <Button
          title="Log out"
          variant="secondary"
          onPress={() => setConfirmingLogout(true)}
        />
      </View>

      <ConfirmSheet
        visible={confirmingLogout}
        title="Log out of AGAP?"
        message="You'll need to log in again before you can send an SOS."
        keepLabel="Stay logged in"
        confirmLabel="Log out"
        confirming={loggingOut}
        onConfirm={logOut}
        onKeep={() => setConfirmingLogout(false)}
      />
    </Screen>
  );
}
