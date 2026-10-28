import { Pressable, Text, ActivityIndicator, View } from "react-native";
import type { ReactNode } from "react";
import colors from "@/theme/colors";

type Variant =
  | "primary"
  | "secondary"
  | "destructive"
  | "ghost"
  // For navy backgrounds (live alert screens)
  | "inverse"
  | "ghostInverse";
type Size = "md" | "lg";

const containerClass: Record<Variant, string> = {
  primary: "bg-navy active:bg-navy-dark",
  secondary: "bg-white border-2 border-navy active:bg-navy-tint",
  destructive: "bg-sos active:bg-sos-dark",
  ghost: "bg-transparent active:bg-navy-tint",
  inverse: "bg-white active:bg-navy-tint",
  ghostInverse: "bg-transparent active:bg-white/10",
};

const labelClass: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-navy",
  destructive: "text-white",
  ghost: "text-navy",
  inverse: "text-navy",
  ghostInverse: "text-white",
};

const spinnerColor: Record<Variant, string> = {
  primary: "#ffffff",
  secondary: colors.navy.DEFAULT,
  destructive: "#ffffff",
  ghost: colors.navy.DEFAULT,
  inverse: colors.navy.DEFAULT,
  ghostInverse: "#ffffff",
};

const sizeClass: Record<Size, string> = {
  md: "h-12 px-5",
  lg: "h-14 px-6",
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Label shown next to the spinner while loading, e.g. "Logging in…" */
  loadingTitle?: string;
  disabled?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  loadingTitle,
  disabled = false,
  icon,
  accessibilityHint,
  className = "",
}: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`flex-row items-center justify-center rounded-full ${sizeClass[size]} ${containerClass[variant]} ${
        disabled ? "opacity-40" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor[variant]} />
      ) : (
        icon && <View className="mr-2">{icon}</View>
      )}
      <Text
        className={`text-base font-semibold ${labelClass[variant]} ${
          loading ? "ml-2" : ""
        }`}
      >
        {loading && loadingTitle ? loadingTitle : title}
      </Text>
    </Pressable>
  );
}
