import { Pressable, Text } from "react-native";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** "radio" for single choice, "checkbox" for multi-select */
  role?: "radio" | "checkbox";
}

export function Chip({ label, selected, onPress, role = "checkbox" }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "radio" ? { selected } : { checked: selected }}
      className={`mb-2 mr-2 min-h-[44px] justify-center rounded-full border px-4 ${
        selected
          ? "border-navy bg-navy"
          : "border-line bg-white active:bg-navy-tint"
      }`}
    >
      <Text
        className={`text-sm font-medium ${selected ? "text-white" : "text-ink"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
