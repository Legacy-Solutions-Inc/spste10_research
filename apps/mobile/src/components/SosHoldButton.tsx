import { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import colors from "@/theme/colors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const SOS_HOLD_MS = 2000;

const BUTTON_SIZE = 200;
const RING_STROKE = 10;
const RING_GAP = 6;
const RING_SIZE = BUTTON_SIZE + (RING_GAP + RING_STROKE) * 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface SosHoldButtonProps {
  onSend: () => void;
  /** Lets a parent ScrollView stop scrolling, which would steal the touch */
  onHoldChange?: (holding: boolean) => void;
  disabled?: boolean;
}

/**
 * Press and hold to send. A short tap can't trigger it, which keeps accidental
 * alerts out of pockets and usability sessions. Screen-reader users get an
 * explicit "Send emergency alert" action instead of the gesture.
 */
export function SosHoldButton({
  onSend,
  onHoldChange,
  disabled = false,
}: SosHoldButtonProps) {
  const progress = useSharedValue(0);
  const sentRef = useRef(false);

  const complete = () => {
    if (sentRef.current) return;
    sentRef.current = true;
    onHoldChange?.(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSend();
    // Reset for when the user comes back to Home
    setTimeout(() => {
      progress.value = 0;
      sentRef.current = false;
    }, 600);
  };

  const startHold = () => {
    if (disabled) return;
    onHoldChange?.(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    progress.value = withTiming(
      1,
      {
        duration: SOS_HOLD_MS * (1 - progress.value),
        // The fill is the countdown itself; ReduceMotion.System would jump to
        // the end and turn a tap into a sent alert
        reduceMotion: ReduceMotion.Never,
      },
      (finished) => {
        if (finished) scheduleOnRN(complete);
      }
    );
  };

  const releaseHold = () => {
    if (sentRef.current) return;
    onHoldChange?.(false);
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 200 });
  };

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View
      className="items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.sos.tint}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.sos.dark}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          animatedProps={ringProps}
        />
      </Svg>

      <Pressable
        onPressIn={startHold}
        onPressOut={releaseHold}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS"
        accessibilityHint="Press and hold for 2 seconds to send an emergency alert with your location"
        accessibilityState={{ disabled }}
        accessibilityActions={[
          { name: "activate", label: "Send emergency alert" },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "activate" && !disabled) {
            complete();
          }
        }}
        className="items-center justify-center rounded-full bg-sos active:bg-sos-dark"
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <Text className="text-5xl font-extrabold tracking-widest text-white">
          SOS
        </Text>
        <Text className="mt-1 text-sm font-semibold text-white">
          Hold 2 seconds
        </Text>
      </Pressable>
    </View>
  );
}
