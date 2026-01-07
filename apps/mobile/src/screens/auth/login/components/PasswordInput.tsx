import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  className?: string;
}

export function PasswordInput({
  value,
  onChangeText,
  editable = true,
  className = "",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`mb-8 ${className}`}>
      <Text className="text-base font-medium text-gray-900 mb-3">
        Password
      </Text>
      <View className="flex-row items-center border-b border-gray-300 pb-3">
        <TextInput
          className="flex-1 text-base text-gray-900"
          placeholder="Enter your password"
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          disabled={!editable}
        >
          <Text className="text-gray-600 text-base">
            {showPassword ? "Hide" : "Show"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

