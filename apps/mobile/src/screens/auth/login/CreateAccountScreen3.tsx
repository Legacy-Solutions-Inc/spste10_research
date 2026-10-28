import { View, Text } from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useSignUp } from "./hooks/useSignUp";
import { AuthLayout } from "./components/AuthLayout";

const MIN_PASSWORD_LENGTH = 6;

export function CreateAccountScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Login3">>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { signUp, loading, supabaseAvailable } = useSignUp();

  // Validate here so nothing fails silently; server errors still come from the hook
  const handleCreateAccount = () => {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    signUp(email, password);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="You'll add your emergency info next."
    >
      <TextField
        label="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setErrors((current) => ({ ...current, email: undefined }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!loading && supabaseAvailable}
        error={errors.email}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setErrors((current) => ({ ...current, password: undefined }));
        }}
        secureToggle
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!loading && supabaseAvailable}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={errors.password}
      />

      <Button
        title="Create account"
        loadingTitle="Creating account…"
        size="lg"
        loading={loading}
        disabled={!supabaseAvailable}
        onPress={handleCreateAccount}
        className="mt-2"
      />

      <View className="mt-6 items-center">
        <Text className="text-sm text-ink-muted">
          Already have an account?{" "}
          <Text
            className="font-semibold text-navy"
            onPress={() => navigation.navigate("Login2")}
            accessibilityRole="link"
          >
            Log in
          </Text>
        </Text>
      </View>
    </AuthLayout>
  );
}
