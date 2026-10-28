import { View, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StatusBadge } from "@/components/StatusBadge";
import colors from "@/theme/colors";
import { useIncidentDetails } from "./hooks/useIncidentDetails";

type HistoryDetailsNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "HistoryDetails"
>;
type HistoryDetailsRouteProp = RouteProp<RootStackParamList, "HistoryDetails">;

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="border-b border-line py-3">
      <Text className="text-sm text-ink-subtle">{label}</Text>
      <Text className="mt-0.5 text-base leading-6 text-ink">{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="mt-6 text-base font-bold text-ink"
    >
      {children}
    </Text>
  );
}

export function HistoryDetailsScreen() {
  const navigation = useNavigation<HistoryDetailsNavigation>();
  const route = useRoute<HistoryDetailsRouteProp>();
  const {
    id,
    incidentType,
    imageUri,
    date,
    latitude,
    longitude,
    locationName,
    description,
    status,
  } = route.params;
  const isAlert = incidentType === "alert";
  const { details, loading } = useIncidentDetails(incidentType, id);

  const when = new Date(date);
  const whenText = `${when.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} at ${when.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
  // The AI text can arrive after the history list was loaded
  const aiDescription = details?.description || description || null;
  const hasVictimInfo =
    !!details &&
    [
      details.victim_name,
      details.victim_age,
      details.victim_sex,
      details.victim_blood_type,
      details.victim_contact,
    ].some((value) => value !== null && value !== undefined && value !== "");

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={isAlert ? "Emergency alert" : "Report"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {isAlert ? (
          <View className="h-40 items-center justify-center rounded-2xl bg-sos-tint">
            <MaterialCommunityIcons
              name="alarm-light"
              size={64}
              color={colors.sos.DEFAULT}
            />
          </View>
        ) : imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 240, borderRadius: 16 }}
            resizeMode="cover"
            accessibilityLabel="Photo sent with this report"
          />
        ) : (
          <View className="h-40 items-center justify-center rounded-2xl bg-surface">
            <MaterialCommunityIcons
              name="image-off-outline"
              size={48}
              color={colors.ink.subtle}
            />
            <Text className="mt-2 text-sm text-ink-muted">No photo</Text>
          </View>
        )}

        <View className="mt-4">
          <StatusBadge status={status} />
        </View>

        <DetailRow label="Sent" value={whenText} />
        <DetailRow label="Location" value={locationName} />
        <DetailRow
          label="Coordinates"
          value={`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
        />
        <DetailRow label="Reason for canceling" value={details?.close_reason} />

        {loading ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color={colors.navy.DEFAULT} />
          </View>
        ) : isAlert ? (
          hasVictimInfo &&
          details && (
            <>
              <SectionTitle>Shared with responders</SectionTitle>
              <DetailRow label="Name" value={details.victim_name} />
              <DetailRow
                label="Age"
                value={
                  details.victim_age != null ? `${details.victim_age}` : null
                }
              />
              <DetailRow
                label="Sex"
                value={
                  details.victim_sex
                    ? details.victim_sex.charAt(0).toUpperCase() +
                      details.victim_sex.slice(1)
                    : null
                }
              />
              <DetailRow label="Blood type" value={details.victim_blood_type} />
              <DetailRow label="Contact number" value={details.victim_contact} />
            </>
          )
        ) : (
          <>
            {aiDescription && (
              <>
                <SectionTitle>AI description</SectionTitle>
                <Text className="mt-2 text-base leading-6 text-ink">
                  {aiDescription}
                </Text>
              </>
            )}
            {details?.user_note && (
              <>
                <SectionTitle>Your details</SectionTitle>
                <Text className="mt-2 text-base leading-6 text-ink">
                  {details.user_note}
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
