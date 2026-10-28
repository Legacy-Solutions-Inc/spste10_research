import { useCallback, useState } from "react";
import { View, Text, ScrollView, Image, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { useGetProfile } from "@/screens/settingsOptions/hooks/useGetProfile";
import { SosHoldButton } from "@/components/SosHoldButton";
import { useActiveIncident } from "@/hooks/useActiveIncident";
import { loadEmergencyInfo } from "@/lib/profile";
import { STATUS_LABELS } from "@/lib/incidents";
import colors from "@/theme/colors";

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const insets = useSafeAreaInsets();
  const { profileData, refetch: refetchProfile } = useGetProfile();
  const activeIncident = useActiveIncident();
  const [infoMissing, setInfoMissing] = useState(false);
  // Scrolling while the SOS is held would steal the touch and reset the hold
  const [holdingSos, setHoldingSos] = useState(false);

  // Name, photo and the emergency-info nudge stay current after editing them
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      loadEmergencyInfo()
        .then((info) => setInfoMissing(!info.firstName || !info.contactNumber))
        .catch(() => setInfoMissing(false));
      // refetchProfile is recreated every render; focus is the real trigger
    }, [])
  );

  const displayName =
    profileData?.first_name ||
    profileData?.full_name ||
    profileData?.email?.split("@")[0] ||
    null;

  const openActive = () => {
    if (!activeIncident) return;
    if (activeIncident.kind === "alert") {
      navigation.navigate("AlertLive", { id: activeIncident.id });
    } else {
      navigation.navigate("ReportLive", { id: activeIncident.id });
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      scrollEnabled={!holdingSos}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <StatusBar style="dark" />

      {/* Header: greeting + account */}
      <View className="flex-row items-center justify-between px-4">
        <View className="flex-1 pr-4">
          <Text className="text-base text-ink-muted">Hello,</Text>
          <Text
            className="text-2xl font-extrabold text-ink"
            numberOfLines={1}
          >
            {displayName ?? "there"}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Account")}
          accessibilityRole="button"
          accessibilityLabel="Account and settings"
          hitSlop={8}
          className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface active:opacity-80"
        >
          {profileData?.avatar_url ? (
            <Image
              source={{ uri: profileData.avatar_url }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={32}
              color={colors.ink.subtle}
            />
          )}
        </Pressable>
      </View>

      {/* An open alert/report always comes first */}
      {activeIncident ? (
        <Pressable
          onPress={openActive}
          accessibilityRole="button"
          accessibilityLabel={`Your ${activeIncident.kind} is active: ${
            STATUS_LABELS[activeIncident.status]
          }. Open it.`}
          className="mx-4 mt-6 flex-row items-center rounded-2xl bg-sos-tint p-4 active:opacity-80"
        >
          <View className="h-3 w-3 rounded-full bg-sos" />
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-ink">
              Your {activeIncident.kind} is active
            </Text>
            <Text className="text-sm text-ink-muted">
              {STATUS_LABELS[activeIncident.status]}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={26}
            color={colors.ink.muted}
          />
        </Pressable>
      ) : (
        infoMissing && (
          <Pressable
            onPress={() => navigation.navigate("Profile")}
            accessibilityRole="button"
            accessibilityLabel="Add your emergency info so responders know who they're helping"
            className="mx-4 mt-6 flex-row items-center rounded-2xl bg-navy-tint p-4 active:opacity-80"
          >
            <MaterialCommunityIcons
              name="card-account-details-outline"
              size={26}
              color={colors.navy.DEFAULT}
            />
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-navy">
                Add your emergency info
              </Text>
              <Text className="text-sm leading-5 text-ink-muted">
                So responders know who you are and how to reach you.
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={26}
              color={colors.navy.DEFAULT}
            />
          </Pressable>
        )
      )}

      {/* SOS: hold to send */}
      <View className="mt-8 items-center px-6">
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
          <SosHoldButton
            onSend={() => navigation.navigate("AlertLive")}
            onHoldChange={setHoldingSos}
          />
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
    </ScrollView>
  );
}
