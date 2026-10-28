import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { markOnboarded } from "@/lib/onboarding";
import colors from "@/theme/colors";

type LocationPermissionNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "OnboardingLocation"
>;

/**
 * Step 2 of onboarding: ask for location once, with the reason, so the OS
 * prompt never appears for the first time in the middle of an emergency.
 */
export function LocationPermissionScreen() {
  const navigation = useNavigation<LocationPermissionNavigation>();
  const { session } = useAuth();
  const [requesting, setRequesting] = useState(false);

  const finish = useCallback(async () => {
    if (session) await markOnboarded(session.user.id);
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  }, [navigation, session]);

  // Nothing to ask if it's already allowed
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((permission) => {
      if (permission.granted) finish();
    });
  }, [finish]);

  const allow = async () => {
    setRequesting(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } finally {
      setRequesting(false);
      finish();
    }
  };

  return (
    <Screen>
      <View className="px-6 pt-4">
        <Text className="text-sm font-semibold text-navy">Step 2 of 2</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-navy-tint">
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={56}
            color={colors.navy.DEFAULT}
          />
        </View>
        <Text
          accessibilityRole="header"
          className="mt-6 text-center text-3xl font-extrabold text-ink"
        >
          Allow location
        </Text>
        <Text className="mt-3 text-center text-base leading-6 text-ink-muted">
          When you send an SOS or a report, AGAP shares your location so
          responders can find you. It's only used at those moments.
        </Text>
      </View>
      <View className="px-6 pb-4">
        <Button
          title="Allow location"
          size="lg"
          loading={requesting}
          onPress={allow}
        />
        <Button
          title="Not now"
          variant="ghost"
          disabled={requesting}
          onPress={finish}
          className="mt-2"
        />
      </View>
    </Screen>
  );
}
