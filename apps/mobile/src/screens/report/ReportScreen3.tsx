import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CallHotlineButton } from "@/components/CallHotlineButton";
import {
  ensureLocationPermission,
  getQuickPosition,
  describeLocation,
  type QuickPosition,
} from "@/lib/location";
import {
  createReport,
  updateOpenIncident,
  refineIncidentPosition,
} from "@/lib/incidents";
import { newId } from "@/lib/uuid";
import { useHardwareBack } from "@/navigation/useHardwareBack";
import colors from "@/theme/colors";
import { useUploadReportImage } from "./hooks/useUploadReportImage";
import { useAnalyzePhoto } from "./hooks/useAnalyzePhoto";

type Report3Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Report3"
>;
type Report3RouteProp = RouteProp<RootStackParamList, "Report3">;

const DETAIL_CHIPS = [
  "Unconscious",
  "Heavy bleeding",
  "Not breathing",
  "Vehicle accident",
  "Fire",
];
const NOTE_MAX = 200;
// A slow upload shouldn't hold the report back; it is sent without the photo
const PHOTO_UPLOAD_TIMEOUT_MS = 20000;

type Analysis =
  | { state: "running" }
  | { state: "done"; text: string }
  | { state: "unavailable" };

type LocationState =
  | { state: "locating" }
  | { state: "found"; position: QuickPosition; name?: string }
  | { state: "missing"; permissionDenied: boolean };

export function ReportScreen3() {
  const navigation = useNavigation<Report3Navigation>();
  const route = useRoute<Report3RouteProp>();
  const { imageUri, timestamp } = route.params;
  const insets = useSafeAreaInsets();
  const { analyzePhoto } = useAnalyzePhoto();
  const { uploadImage } = useUploadReportImage();

  const [analysis, setAnalysis] = useState<Analysis>({ state: "running" });
  const analysisRef = useRef<Promise<string | null> | null>(null);
  const [location, setLocation] = useState<LocationState>({
    state: "locating",
  });
  const [chips, setChips] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  // One id for every attempt: the photo is stored under it before the row
  // exists, and a retry after a timeout can't create a second report
  const reportIdRef = useRef(newId());

  const goBack = () => {
    if (!sending) navigation.goBack();
  };
  // Leaving mid-send and sending again would create a second report
  useHardwareBack(goBack);

  // The AI description is generated in the background and never blocks Send
  useEffect(() => {
    if (analysisRef.current) return;
    const promise = analyzePhoto(imageUri).catch(() => null);
    analysisRef.current = promise;
    let active = true;
    promise.then((text) => {
      if (!active) return;
      setAnalysis(text ? { state: "done", text } : { state: "unavailable" });
    });
    return () => {
      active = false;
    };
  }, [imageUri, analyzePhoto]);

  const locate = useCallback(async () => {
    setLocation({ state: "locating" });
    let permissionDenied = false;
    let position: QuickPosition | null = null;
    try {
      const permitted = await ensureLocationPermission();
      permissionDenied = !permitted;
      position = permitted ? await getQuickPosition() : null;
    } catch (err) {
      // A failed check isn't a refusal; offer a retry rather than Settings
      console.log("Location error:", err);
    }
    if (!position) {
      setLocation({ state: "missing", permissionDenied });
      return;
    }
    setLocation({ state: "found", position });
    const name = await describeLocation(position);
    if (name) {
      setLocation((current) =>
        current.state === "found" ? { ...current, name } : current
      );
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const toggleChip = (chip: string) => {
    setChips((current) =>
      current.includes(chip)
        ? current.filter((c) => c !== chip)
        : [...current, chip]
    );
  };

  const send = async () => {
    if (location.state !== "found" || sending) return;
    setSending(true);

    const aiText = analysis.state === "done" ? analysis.text : null;
    const userNote =
      [chips.join(", "), note.trim()].filter(Boolean).join("\n") || null;

    const id = reportIdRef.current;
    try {
      // Upload first so the row is created with its photo: responders can
      // see it immediately, and a quick acceptance can't leave it unattached
      const imagePath = await Promise.race([
        uploadImage(imageUri, id),
        new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), PHOTO_UPLOAD_TIMEOUT_MS)
        ),
      ]);

      await createReport(id, {
        coords: location.position,
        locationName: location.name,
        imagePath,
        description: aiText,
        userNote,
      });

      // Attach the AI text whenever it finishes, even after this screen is gone
      if (!aiText && analysis.state === "running") {
        analysisRef.current?.then((text) => {
          if (text) updateOpenIncident("report", id, { description: text });
        });
      }
      refineIncidentPosition("report", id, location.position, location.name);

      // The live screen sits directly on Home; camera/review screens are dropped
      navigation.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: "ReportLive", params: { id } }],
      });
    } catch (err) {
      setSending(false);
      Alert.alert(
        "Your report wasn't sent",
        `${
          err instanceof Error ? err.message : "Please try again."
        } If someone is in danger, call 911.`
      );
    }
  };

  const locationLabel =
    location.state === "locating"
      ? "Finding your location…"
      : location.state === "missing"
        ? "Location unavailable"
        : location.name ||
          `${location.position.latitude.toFixed(5)}, ${location.position.longitude.toFixed(5)}`;

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Review report" onBack={goBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 220, borderRadius: 16 }}
            resizeMode="cover"
            accessibilityLabel="Your photo"
          />
          <View className="mt-3 flex-row items-center">
            <MaterialCommunityIcons
              name="map-marker"
              size={18}
              color={colors.navy.DEFAULT}
            />
            <Text className="ml-1 flex-1 text-sm text-ink-muted" numberOfLines={1}>
              {locationLabel}
            </Text>
            <Text className="ml-2 text-sm text-ink-subtle">
              {new Date(timestamp).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>

          {/* AI description: read-only so its output stays exactly as generated */}
          <Text
            accessibilityRole="header"
            className="mt-6 text-base font-bold text-ink"
          >
            AI description
          </Text>
          <Text className="mt-0.5 text-sm text-ink-subtle">
            Written automatically from your photo. Responders see it as-is.
          </Text>
          <View
            className="mt-2 min-h-[88px] justify-center rounded-2xl bg-surface p-4"
            accessibilityLiveRegion="polite"
          >
            {analysis.state === "running" && (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={colors.navy.DEFAULT} />
                <Text className="ml-3 flex-1 text-sm leading-5 text-ink-muted">
                  Analyzing your photo… You can send now; the description will
                  follow.
                </Text>
              </View>
            )}
            {analysis.state === "done" && (
              <Text className="text-sm leading-5 text-ink">{analysis.text}</Text>
            )}
            {analysis.state === "unavailable" && (
              <Text className="text-sm leading-5 text-ink-muted">
                Couldn't describe this photo. Responders will still see it.
              </Text>
            )}
          </View>

          {/* The reporter's own details, stored separately from the AI text */}
          <Text
            accessibilityRole="header"
            className="mt-6 text-base font-bold text-ink"
          >
            Add details (optional)
          </Text>
          <View className="mt-2 flex-row flex-wrap">
            {DETAIL_CHIPS.map((chip) => (
              <Chip
                key={chip}
                label={chip}
                selected={chips.includes(chip)}
                onPress={() => toggleChip(chip)}
              />
            ))}
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={NOTE_MAX}
            multiline
            textAlignVertical="top"
            placeholder="Anything else responders should know?"
            placeholderTextColor={colors.ink.subtle}
            accessibilityLabel="Extra details for responders"
            className="mt-2 min-h-[88px] rounded-2xl border border-line p-4 text-base text-ink"
          />
          <Text className="mt-1 text-right text-xs text-ink-subtle">
            {note.length}/{NOTE_MAX}
          </Text>
        </ScrollView>

        <View className="px-4 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
          {location.state === "missing" ? (
            <>
              <Text className="mb-3 text-center text-sm leading-5 text-ink-muted">
                {location.permissionDenied
                  ? "Turn on location so responders can find this emergency."
                  : "We can't find your location yet. Move near a window or outside."}
              </Text>
              <CallHotlineButton className="mb-2" />
              {location.permissionDenied && (
                <Button
                  title="Open Settings"
                  variant="secondary"
                  onPress={() => Linking.openSettings()}
                  className="mb-2"
                />
              )}
              <Button
                title="Try again"
                variant={location.permissionDenied ? "ghost" : "secondary"}
                onPress={locate}
              />
            </>
          ) : (
            <Button
              title="Send report"
              size="lg"
              loading={sending}
              loadingTitle="Sending…"
              disabled={location.state !== "found"}
              onPress={send}
              accessibilityHint={
                location.state === "locating"
                  ? "Available once your location is found"
                  : undefined
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
