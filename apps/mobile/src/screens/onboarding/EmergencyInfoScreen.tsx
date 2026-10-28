import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { DateField } from "@/components/ui/DateField";
import {
  BLOOD_TYPES,
  SEX_OPTIONS,
  EMPTY_EMERGENCY_INFO,
  ageFromBirthday,
  isValidContactNumber,
  loadEmergencyInfo,
  saveEmergencyInfo,
  saveAvatarUrl,
  type EmergencyInfo,
} from "@/lib/profile";
import { useGetProfile } from "@/screens/settingsOptions/hooks/useGetProfile";
import { useUploadProfileImage } from "@/screens/settingsOptions/hooks/useUploadProfileImage";
import colors from "@/theme/colors";

type EmergencyInfoNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "OnboardingInfo" | "Profile"
>;

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-1.5 text-sm font-semibold text-ink">{children}</Text>
  );
}

/**
 * The citizen's emergency info. Step 1 of onboarding ("OnboardingInfo") and the
 * editable profile ("Profile") share this screen; the profile adds a photo and
 * home address.
 */
export function EmergencyInfoScreen() {
  const navigation = useNavigation<EmergencyInfoNavigation>();
  const route = useRoute();
  const onboarding = route.name === "OnboardingInfo";
  const insets = useSafeAreaInsets();

  const [info, setInfo] = useState<EmergencyInfo>(EMPTY_EMERGENCY_INFO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contactError, setContactError] = useState<string | undefined>();

  const { profileData, refetch } = useGetProfile();
  const { uploadImage, loading: uploadingPhoto } = useUploadProfileImage();
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadEmergencyInfo()
      .then(setInfo)
      .catch((err) => console.log("Load emergency info failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<EmergencyInfo>) => {
    setInfo((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const goNext = () => navigation.navigate("OnboardingLocation");

  const save = async () => {
    if (info.contactNumber.trim() && !isValidContactNumber(info.contactNumber)) {
      setContactError("Enter a mobile number like 0917 123 4567.");
      return;
    }
    setSaving(true);
    try {
      await saveEmergencyInfo(info);
      if (onboarding) {
        goNext();
      } else {
        setSaved(true);
      }
    } catch (err) {
      Alert.alert(
        "Couldn't save",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Photos access needed", "Allow access to choose a profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setLocalPhoto(uri);
    const uploaded = await uploadImage(uri);
    if (!uploaded) {
      setLocalPhoto(null);
      return;
    }
    try {
      await saveAvatarUrl(uploaded);
      refetch();
    } catch (err) {
      setLocalPhoto(null);
      Alert.alert("Couldn't save photo", err instanceof Error ? err.message : "");
    }
  };

  const age = ageFromBirthday(info.birthday);
  const photo = localPhoto ?? profileData?.avatar_url ?? null;

  return (
    <Screen edges={["top"]}>
      {onboarding ? (
        <View className="px-6 pt-4">
          <Text className="text-sm font-semibold text-navy">Step 1 of 2</Text>
          <Text
            accessibilityRole="header"
            className="mt-1 text-3xl font-extrabold text-ink"
          >
            Your emergency info
          </Text>
          <Text className="mt-2 text-base leading-6 text-ink-muted">
            Responders see this when you send an SOS, so they know who they're
            helping. Every field is optional and you can change it later.
          </Text>
        </View>
      ) : (
        <ScreenHeader title="Emergency info" onBack={() => navigation.goBack()} />
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.navy.DEFAULT} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingTop: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {!onboarding && (
              <View className="mb-6 items-center">
                <Pressable
                  onPress={changePhoto}
                  disabled={uploadingPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                  className="h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-surface"
                >
                  {photo ? (
                    <Image source={{ uri: photo }} className="h-full w-full" />
                  ) : (
                    <MaterialCommunityIcons
                      name="account"
                      size={56}
                      color={colors.ink.subtle}
                    />
                  )}
                  {uploadingPhoto && (
                    <View className="absolute inset-0 items-center justify-center bg-black/40">
                      <ActivityIndicator color="#ffffff" />
                    </View>
                  )}
                </Pressable>
                <Button
                  title="Change photo"
                  variant="ghost"
                  onPress={changePhoto}
                  disabled={uploadingPhoto}
                  className="mt-1"
                />
                <Text className="mt-1 text-center text-sm leading-5 text-ink-muted">
                  Responders see this info when you send an SOS.
                </Text>
              </View>
            )}

            <View className="flex-row">
              <View className="mr-3 flex-1">
                <TextField
                  label="First name"
                  value={info.firstName}
                  onChangeText={(firstName) => update({ firstName })}
                  autoComplete="given-name"
                  textContentType="givenName"
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Last name"
                  value={info.lastName}
                  onChangeText={(lastName) => update({ lastName })}
                  autoComplete="family-name"
                  textContentType="familyName"
                />
              </View>
            </View>

            <TextField
              label="Contact number"
              value={info.contactNumber}
              onChangeText={(contactNumber) => {
                update({ contactNumber });
                setContactError(undefined);
              }}
              placeholder="0917 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              hint="Responders may call you on this number."
              error={contactError}
            />

            <DateField
              label="Birthday"
              value={info.birthday}
              onChange={(birthday) => update({ birthday })}
              hint={age !== null ? `Age: ${age}` : "Used to tell responders your age."}
            />

            <FieldLabel>Sex</FieldLabel>
            <View className="mb-2 flex-row flex-wrap">
              {SEX_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  role="radio"
                  selected={info.sex === option.value}
                  onPress={() =>
                    update({ sex: info.sex === option.value ? null : option.value })
                  }
                />
              ))}
            </View>

            <FieldLabel>Blood type</FieldLabel>
            <View className="flex-row flex-wrap">
              {BLOOD_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={type}
                  role="radio"
                  selected={info.bloodType === type}
                  onPress={() =>
                    update({ bloodType: info.bloodType === type ? null : type })
                  }
                />
              ))}
            </View>
            <Text className="mb-4 text-sm text-ink-subtle">
              Leave it blank if you don't know.
            </Text>

            {!onboarding && (
              <TextField
                label="Home address"
                value={info.address}
                onChangeText={(address) => update({ address })}
                autoComplete="street-address"
                textContentType="fullStreetAddress"
              />
            )}
          </ScrollView>

          <View className="px-6 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
            <Button
              title={onboarding ? "Save and continue" : "Save"}
              size="lg"
              loading={saving}
              loadingTitle="Saving…"
              onPress={save}
            />
            {onboarding ? (
              <Button
                title="Skip for now"
                variant="ghost"
                onPress={goNext}
                className="mt-2"
              />
            ) : (
              saved && (
                <Text
                  className="mt-2 text-center text-sm text-ink-muted"
                  accessibilityLiveRegion="polite"
                >
                  Saved
                </Text>
              )
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
