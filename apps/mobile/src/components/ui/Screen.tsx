import { View } from "react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Edge = "top" | "bottom";

interface ScreenProps {
  children: ReactNode;
  /** Background and layout classes; defaults to a white screen */
  className?: string;
  /** Which safe-area edges to pad (full-bleed screens can opt out) */
  edges?: Edge[];
}

export function Screen({
  children,
  className = "bg-white",
  edges = ["top", "bottom"],
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 ${className}`}
      style={{
        paddingTop: edges.includes("top") ? insets.top : 0,
        paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
      }}
    >
      {children}
    </View>
  );
}
