import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        className="h-12 w-12 items-center justify-center rounded-full bg-navy active:bg-navy-dark"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
      </Pressable>
      <Text
        accessibilityRole="header"
        className="flex-1 text-center text-xl font-bold text-navy"
      >
        {title}
      </Text>
      {/* Balances the back button so the title stays centered */}
      <View className="w-12" />
    </View>
  );
}
