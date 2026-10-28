import { useState } from "react";
import { View, Text, TextInput, Pressable, type TextInputProps } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "@/theme/colors";

interface TextFieldProps extends TextInputProps {
  label: string;
  /** Shown under the field and outlines it; replaces the hint */
  error?: string;
  hint?: string;
  /** Adds a show/hide button for passwords */
  secureToggle?: boolean;
}

export function TextField({
  label,
  error,
  hint,
  secureToggle = false,
  secureTextEntry,
  ...inputProps
}: TextFieldProps) {
  const [hidden, setHidden] = useState(true);
  const secure = secureToggle ? hidden : secureTextEntry;

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-semibold text-ink">{label}</Text>
      <View
        className={`h-12 flex-row items-center rounded-xl border bg-white px-4 ${
          error ? "border-sos" : "border-line"
        }`}
      >
        <TextInput
          className="flex-1 text-base text-ink"
          placeholderTextColor={colors.ink.subtle}
          secureTextEntry={secure}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          {...inputProps}
        />
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={12}
            className="ml-2"
          >
            <MaterialCommunityIcons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={colors.ink.muted}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text className="mt-1 text-sm text-sos-dark" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1 text-sm text-ink-subtle">{hint}</Text>
      ) : null}
    </View>
  );
}
