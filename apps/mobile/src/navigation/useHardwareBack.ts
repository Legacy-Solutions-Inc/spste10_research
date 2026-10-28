import { useCallback, useRef } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Overrides the Android hardware back button while the screen is focused.
 * With no handler, back is swallowed entirely (used on live alert/report
 * screens, where leaving must go through Cancel). Pair with
 * `gestureEnabled: false` in the screen options to also block iOS swipe-back.
 */
export function useHardwareBack(onBack?: () => void) {
  // Kept in a ref so callers can pass inline functions without resubscribing
  const handlerRef = useRef(onBack);
  handlerRef.current = onBack;

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handlerRef.current?.();
          return true;
        }
      );
      return () => subscription.remove();
    }, [])
  );
}
