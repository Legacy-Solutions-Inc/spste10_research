import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Linking,
  AccessibilityInfo,
} from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { useHardwareBack } from "@/navigation/useHardwareBack";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusTracker, type TrackerStep } from "@/components/StatusTracker";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { PulseRings } from "@/components/PulseRings";
import { CallHotlineButton } from "@/components/CallHotlineButton";
import { useLiveIncident, isTerminal } from "@/hooks/useLiveIncident";
import { useNow } from "@/hooks/useNow";
import {
  ensureLocationPermission,
  getQuickPosition,
  type QuickPosition,
} from "@/lib/location";
import {
  createAlert,
  refineIncidentPosition,
  closeIncident,
  type IncidentKind,
} from "@/lib/incidents";
import colors from "@/theme/colors";

type LiveNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "AlertLive" | "ReportLive"
>;
type LiveRoute = RouteProp<RootStackParamList, "AlertLive" | "ReportLive">;

// After this long without a responder, surface the hotline
const ESCALATE_AFTER_MS = 60000;

const COPY = {
  alert: {
    noun: "alert",
    Noun: "Alert",
    icon: "broadcast",
    sentBody:
      "Responders near you can see your alert and location. Stay where you are if it's safe.",
    escalatedBody: "If you're in danger, call 911 now. Your alert stays active.",
    acceptedBody:
      "A responder accepted your alert. Stay where you are and keep your phone with you.",
    completedTitle: "Glad you're safe",
    cancelReasons: [
      "Sent by mistake",
      "Help came another way",
      "I'm safe now",
      "Other",
    ],
  },
  report: {
    noun: "report",
    Noun: "Report",
    icon: "camera",
    sentBody:
      "Responders near you can see your photo and location. Stay nearby if it's safe.",
    escalatedBody:
      "If someone is in danger, call 911 now. Your report stays active.",
    acceptedBody:
      "A responder accepted your report. Stay nearby if it's safe and keep your phone with you.",
    completedTitle: "Thanks for reporting",
    cancelReasons: [
      "Sent by mistake",
      "Help came another way",
      "The person is safe now",
      "Other",
    ],
  },
} as const;

type SendPhase =
  | { step: "locating" }
  | { step: "sending" }
  | { step: "noLocation"; permissionDenied: boolean }
  | { step: "failed"; message: string }
  | { step: "sent" };

function formatTime(iso: string | number) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Full-screen message with an icon and actions (errors and closed states) */
function MessageView({
  icon,
  iconColor = colors.navy.DEFAULT,
  title,
  body,
  children,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <Screen>
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-navy-tint">
          <MaterialCommunityIcons name={icon} size={48} color={iconColor} />
        </View>
        <Text
          accessibilityRole="header"
          className="mt-6 text-center text-2xl font-bold text-ink"
        >
          {title}
        </Text>
        <Text className="mt-2 text-center text-base leading-6 text-ink-muted">
          {body}
        </Text>
      </View>
      <View className="px-6 pb-4">{children}</View>
    </Screen>
  );
}

export function IncidentLiveScreen() {
  const navigation = useNavigation<LiveNavigation>();
  const route = useRoute<LiveRoute>();
  const kind: IncidentKind = route.name === "ReportLive" ? "report" : "alert";
  const copy = COPY[kind];
  const noun = copy.noun;

  const [incidentId, setIncidentId] = useState(route.params?.id);
  const [sendPhase, setSendPhase] = useState<SendPhase>(
    incidentId ? { step: "sent" } : { step: "locating" }
  );
  const [sheet, setSheet] = useState<null | "cancel" | "noLongerNeeded">(null);
  const [closing, setClosing] = useState<null | "completed" | "canceled">(null);
  const sentAtRef = useRef<number | null>(null);
  const sendStartedRef = useRef(false);

  const { incident, error, refresh } = useLiveIncident(kind, incidentId);
  const status = incident?.status;

  const busySending =
    sendPhase.step === "locating" || sendPhase.step === "sending";
  const waiting =
    sendPhase.step === "sent" && (!status || status === "pending");
  const now = useNow(5000, waiting);
  const sentAt =
    sentAtRef.current ?? (incident ? Date.parse(incident.createdAt) : now);
  const escalated = waiting && now - sentAt >= ESCALATE_AFTER_MS;

  const sendAlert = useCallback(async () => {
    setSendPhase({ step: "locating" });
    let permitted = false;
    let position: QuickPosition | null = null;
    try {
      permitted = await ensureLocationPermission();
      position = permitted ? await getQuickPosition() : null;
    } catch (err) {
      console.log("Location error:", err);
    }
    if (!position) {
      setSendPhase({ step: "noLocation", permissionDenied: !permitted });
      return;
    }

    setSendPhase({ step: "sending" });
    try {
      const id = await createAlert(position);
      sentAtRef.current = Date.now();
      setIncidentId(id);
      // Keeps the id if the screen is re-rendered from navigation state
      navigation.setParams({ id });
      setSendPhase({ step: "sent" });
      refineIncidentPosition("alert", id, position);
    } catch (err) {
      setSendPhase({
        step: "failed",
        message:
          err instanceof Error ? err.message : "Your alert didn't go through.",
      });
    }
  }, [navigation]);

  // Arriving from Home's SOS button: send right away
  useEffect(() => {
    if (kind === "alert" && !incidentId && !sendStartedRef.current) {
      sendStartedRef.current = true;
      sendAlert();
    }
  }, [kind, incidentId, sendAlert]);

  // React to status changes from responders
  const previousStatus = useRef(status);
  useEffect(() => {
    if (status === previousStatus.current) return;
    previousStatus.current = status;
    if (status === "canceled") {
      navigation.popToTop();
    } else if (status === "accepted") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility(
        `Help is on the way. A responder accepted your ${noun}.`
      );
    }
  }, [status, navigation, noun]);

  // Nothing is live yet (or anymore), so back simply goes Home; otherwise
  // leaving must go through Cancel
  const canLeave =
    sendPhase.step === "noLocation" ||
    sendPhase.step === "failed" ||
    isTerminal(status);
  useHardwareBack(canLeave ? () => navigation.popToTop() : undefined);

  const close = async (outcome: "completed" | "canceled", reason?: string) => {
    if (!incidentId) return;
    setClosing(outcome);
    try {
      await closeIncident(kind, incidentId, outcome, reason);
      setSheet(null);
      if (outcome === "canceled") {
        navigation.popToTop();
      } else {
        await refresh();
      }
    } catch (err) {
      setSheet(null);
      Alert.alert(
        `Couldn't update your ${noun}`,
        err instanceof Error ? err.message : "Please try again."
      );
      refresh();
    } finally {
      setClosing(null);
    }
  };

  const goHome = () => navigation.popToTop();

  // ---- Not sent: location or network problems
  if (sendPhase.step === "noLocation") {
    return (
      <MessageView
        icon="map-marker-off"
        title={
          sendPhase.permissionDenied
            ? "Location is off for AGAP"
            : "We can't find your location"
        }
        body={
          sendPhase.permissionDenied
            ? "Responders need your location to reach you. Turn it on in Settings, or call 911."
            : "Move near a window or outside, then try again. If you're in danger, call 911."
        }
      >
        <CallHotlineButton className="mb-3" />
        {sendPhase.permissionDenied ? (
          <Button
            title="Open Settings"
            variant="secondary"
            onPress={() => Linking.openSettings()}
            className="mb-2"
          />
        ) : (
          <Button
            title="Try again"
            variant="secondary"
            onPress={sendAlert}
            className="mb-2"
          />
        )}
        <Button title="Back to Home" variant="ghost" onPress={goHome} />
      </MessageView>
    );
  }

  if (sendPhase.step === "failed") {
    return (
      <MessageView
        icon="wifi-off"
        title="Your alert wasn't sent"
        body={`${sendPhase.message} If you're in danger, call 911.`}
      >
        <CallHotlineButton className="mb-3" />
        <Button
          title="Try again"
          variant="secondary"
          onPress={sendAlert}
          className="mb-2"
        />
        <Button title="Back to Home" variant="ghost" onPress={goHome} />
      </MessageView>
    );
  }

  // ---- Closed
  if (status === "completed") {
    return (
      <MessageView
        icon="check-circle"
        title={copy.completedTitle}
        body={`This ${noun} is closed. You can find it later in History.`}
      >
        <Button title="Back to Home" size="lg" onPress={goHome} />
      </MessageView>
    );
  }

  if (status === "rejected") {
    return (
      <MessageView
        icon="account-alert"
        title={`No responder could take this ${noun}`}
        body="If you still need help, call 911 now."
      >
        <CallHotlineButton className="mb-3" />
        <Button title="Back to Home" variant="ghost" onPress={goHome} />
      </MessageView>
    );
  }

  // ---- Live
  const accepted = status === "accepted";
  const locationText = incident
    ? incident.locationName ||
      `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
    : null;

  const steps: TrackerStep[] = [
    {
      label: busySending ? `Sending your ${noun}` : `${copy.Noun} sent`,
      detail: busySending
        ? sendPhase.step === "locating"
          ? "Getting your location"
          : "Contacting responders"
        : formatTime(sentAt),
      state: busySending ? "current" : "done",
    },
    {
      label: accepted ? "Responder on the way" : "Finding a responder",
      detail: accepted
        ? incident?.acceptedAt
          ? `Accepted at ${formatTime(incident.acceptedAt)}`
          : undefined
        : incident?.declined
          ? "A responder couldn't take this — finding another."
          : escalated
            ? "This is taking longer than usual."
            : undefined,
      state: accepted ? "done" : busySending ? "upcoming" : "current",
    },
    {
      label: "Help arrived",
      detail: accepted
        ? "Tap “Help has arrived” when they reach you."
        : undefined,
      state: accepted ? "current" : "upcoming",
    },
  ];

  if (accepted) {
    return (
      <Screen>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <LivePill tone="light" label={`${copy.Noun} is live`} />
          <View className="mt-6 h-20 w-20 items-center justify-center self-center rounded-full bg-navy-tint">
            <MaterialCommunityIcons
              name="account-check"
              size={44}
              color={colors.navy.DEFAULT}
            />
          </View>
          <Text
            accessibilityRole="header"
            className="mt-4 text-center text-3xl font-extrabold text-navy"
          >
            Help is on the way
          </Text>
          <Text className="mt-2 text-center text-base leading-6 text-ink-muted">
            {copy.acceptedBody}
          </Text>
          <View className="mt-6 rounded-2xl border border-line">
            <StatusTracker steps={steps} />
          </View>
          {locationText && (
            <Text className="mt-3 text-center text-sm text-ink-subtle">
              Your location: {locationText}
            </Text>
          )}
        </ScrollView>
        <View className="px-6 pb-4">
          <Button
            title="Help has arrived"
            size="lg"
            loading={closing === "completed"}
            disabled={closing !== null}
            onPress={() => close("completed")}
          />
          <Button
            title="I no longer need help"
            variant="ghost"
            disabled={closing !== null}
            onPress={() => setSheet("noLongerNeeded")}
            className="mt-2"
          />
        </View>
        <ConfirmSheet
          visible={sheet === "noLongerNeeded"}
          title={`Close this ${noun}?`}
          message="The responder will see that you no longer need help."
          reasons={[...copy.cancelReasons]}
          keepLabel="Keep it open"
          confirmLabel="I no longer need help"
          confirming={closing === "canceled"}
          onConfirm={(reason) => close("canceled", reason)}
          onKeep={() => setSheet(null)}
        />
      </Screen>
    );
  }

  const title = busySending
    ? `Sending ${noun}…`
    : escalated
      ? "Still finding a responder…"
      : `${copy.Noun} sent`;
  const subtitle = busySending
    ? "This only takes a few seconds."
    : escalated
      ? copy.escalatedBody
      : copy.sentBody;

  return (
    <Screen className="bg-navy">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {!busySending && (
          <LivePill tone="dark" label={`${copy.Noun} is live`} />
        )}
        <View className="my-4 items-center">
          <PulseRings size={96}>
            <View className="h-24 w-24 items-center justify-center rounded-full bg-white/15">
              <MaterialCommunityIcons
                name={copy.icon}
                size={48}
                color="white"
              />
            </View>
          </PulseRings>
        </View>
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          className="text-center text-3xl font-extrabold text-white"
        >
          {title}
        </Text>
        <Text className="mt-2 text-center text-base leading-6 text-white/80">
          {subtitle}
        </Text>
        <View className="mt-6">
          <StatusTracker steps={steps} />
        </View>
        {locationText && (
          <Text className="mt-3 text-center text-sm text-white/70">
            Your location: {locationText}
          </Text>
        )}
        {error && (
          <Text className="mt-2 text-center text-sm text-white/70">
            {error}
          </Text>
        )}
      </ScrollView>

      <View className="px-6 pb-4">
        {escalated && <CallHotlineButton className="mb-3" />}
        {!busySending && (
          <Button
            title={`Cancel ${noun}`}
            variant="ghostInverse"
            onPress={() => setSheet("cancel")}
          />
        )}
      </View>

      <ConfirmSheet
        visible={sheet === "cancel"}
        title={`Cancel this ${noun}?`}
        message={
          kind === "alert"
            ? "Responders will stop looking for you."
            : "Responders will stop responding to this report."
        }
        reasons={[...copy.cancelReasons]}
        keepLabel={`Keep ${noun} active`}
        confirmLabel={`Cancel ${noun}`}
        confirming={closing === "canceled"}
        onConfirm={(reason) => close("canceled", reason)}
        onKeep={() => setSheet(null)}
      />
    </Screen>
  );
}

function LivePill({ tone, label }: { tone: "dark" | "light"; label: string }) {
  return (
    <View
      className={`flex-row items-center self-center rounded-full px-3 py-1 ${
        tone === "dark" ? "bg-white/10" : "bg-sos-tint"
      }`}
      accessible
      accessibilityLabel={label}
    >
      <View className="h-2.5 w-2.5 rounded-full bg-sos" />
      <Text
        className={`ml-2 text-xs font-bold tracking-widest ${
          tone === "dark" ? "text-white" : "text-sos-dark"
        }`}
      >
        LIVE
      </Text>
    </View>
  );
}
