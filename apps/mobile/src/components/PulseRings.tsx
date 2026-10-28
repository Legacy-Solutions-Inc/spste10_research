import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { ReactNode } from "react";

const RING_COUNT = 3;
const CYCLE_MS = 2400;

function Ring({ progress, size }: { progress: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 1.4 }],
  }));

  return (
    <Animated.View
      className="absolute rounded-full border-2 border-white"
      style={[{ width: size, height: size }, style]}
    />
  );
}

/** Calm radiating rings behind a live-alert icon; static when Reduce Motion is on */
export function PulseRings({ size, children }: { size: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);
  const rings = [ring1, ring2, ring3];

  useEffect(() => {
    if (reduceMotion) return;
    rings.forEach((ring, index) => {
      ring.value = withDelay(
        (CYCLE_MS / RING_COUNT) * index,
        withRepeat(
          withTiming(1, { duration: CYCLE_MS, easing: Easing.out(Easing.quad) }),
          -1
        )
      );
    });
  }, [reduceMotion]);

  return (
    <View
      className="items-center justify-center"
      style={{ width: size * 2, height: size * 2 }}
      importantForAccessibility="no-hide-descendants"
    >
      {!reduceMotion &&
        rings.map((ring, index) => <Ring key={index} progress={ring} size={size} />)}
      {children}
    </View>
  );
}
