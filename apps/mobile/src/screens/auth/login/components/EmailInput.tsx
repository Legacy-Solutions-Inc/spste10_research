import { View, Text, TextInput } from "react-native";

interface EmailInputProps {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  className?: string;
}

export function EmailInput({
  value,
  onChangeText,
  editable = true,
  className = "",
}: EmailInputProps) {
  return (
    <View className={`mb-6 ${className}`}>
      <Text className="text-base font-medium text-gray-900 mb-3">
        Email Address
      </Text>
      <TextInput
        className="text-base text-gray-900 pb-3 border-b border-gray-300"
        placeholder="Enter your email"
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
      />
    </View>
  );
}

