import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABELS, isActiveStatus, type IncidentStatus } from "@/lib/incidents";
import colors from "@/theme/colors";
import { useGetHistory, type HistoryItem } from "./hooks/useGetHistory";

type HistoryNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "History"
>;

function formatWhen(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function TypeIcon({ item }: { item: HistoryItem }) {
  if (item.incident_type === "report" && item.image_url) {
    return (
      <Image
        source={{ uri: item.image_url }}
        className="h-full w-full"
        resizeMode="cover"
      />
    );
  }
  const isAlert = item.incident_type === "alert";
  return (
    <View
      className={`h-full w-full items-center justify-center ${
        isAlert ? "bg-sos-tint" : "bg-navy-tint"
      }`}
    >
      <MaterialCommunityIcons
        name={isAlert ? "alarm-light" : "camera"}
        size={30}
        color={isAlert ? colors.sos.DEFAULT : colors.navy.DEFAULT}
      />
    </View>
  );
}

export function HistoryScreen() {
  const navigation = useNavigation<HistoryNavigation>();
  const { historyItems, loading, error, refetch } = useGetHistory();

  // Statuses change while the user is elsewhere (e.g. a responder resolves one)
  useFocusEffect(
    useCallback(() => {
      refetch();
      // refetch is recreated every render; focus is the real trigger
    }, [])
  );

  const openItem = (item: HistoryItem) => {
    // Open items go back to their live screen rather than a static summary
    if (isActiveStatus(item.status)) {
      if (item.incident_type === "alert") {
        navigation.navigate("AlertLive", { id: item.id });
      } else {
        navigation.navigate("ReportLive", { id: item.id });
      }
      return;
    }
    navigation.navigate("HistoryDetails", {
      id: item.id,
      incidentType: item.incident_type,
      imageUri: item.image_url || "",
      date: item.incident_date,
      latitude: item.latitude,
      longitude: item.longitude,
      locationName: item.location_name || "",
      description: item.description || "",
      status: item.status,
    });
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="History" onBack={() => navigation.goBack()} />

      {loading && historyItems.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.navy.DEFAULT} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="wifi-off" size={56} color={colors.ink.subtle} />
          <Text className="mt-4 text-center text-lg font-bold text-ink">
            Couldn't load your history
          </Text>
          <Text className="mt-1 text-center text-base text-ink-muted">
            Check your connection and try again.
          </Text>
          <Button
            title="Try again"
            variant="secondary"
            onPress={refetch}
            className="mt-6 self-stretch"
          />
        </View>
      ) : historyItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="history" size={56} color={colors.ink.subtle} />
          <Text className="mt-4 text-center text-lg font-bold text-ink">
            No history yet
          </Text>
          <Text className="mt-1 text-center text-base text-ink-muted">
            Alerts and reports you send will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          {historyItems.map((item) => {
            const title =
              item.incident_type === "alert" ? "Emergency alert" : "Report";
            const where = item.location_name || "Location shared";
            const statusLabel =
              STATUS_LABELS[item.status as IncidentStatus] ?? item.status;
            return (
              <Pressable
                key={`${item.incident_type}-${item.id}`}
                onPress={() => openItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${formatWhen(
                  item.incident_date
                )}, ${where}, ${statusLabel}`}
                className="mx-4 my-1.5 flex-row items-center rounded-2xl border border-line bg-white p-3 active:bg-surface"
              >
                <View className="h-16 w-16 overflow-hidden rounded-xl">
                  <TypeIcon item={item} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-ink">{title}</Text>
                  <Text className="text-sm text-ink-muted">
                    {formatWhen(item.incident_date)}
                  </Text>
                  <Text className="mb-1.5 text-sm text-ink-muted" numberOfLines={1}>
                    {where}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.ink.subtle}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
