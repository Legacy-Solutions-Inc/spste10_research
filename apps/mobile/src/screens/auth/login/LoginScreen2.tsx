import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useLogin } from "./hooks/useLogin";
import { AuthLayout } from "./components/AuthLayout";

export function LoginScreen2() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Login2">>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login, loading, supabaseAvailable } = useLogin();

  const handleLogin = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter your email.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    login(email, password);
  };

  return (
    <AuthLayout title="Log in to your account">
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
        autoComplete="current-password"
        textContentType="password"
        editable={!loading && supabaseAvailable}
        error={errors.password}
      />

      <View className="-mt-1 mb-4 items-end">
        <Pressable
          onPress={() => navigation.navigate("Login4")}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text className="text-sm font-semibold text-navy">
            Forgot password?
          </Text>
        </Pressable>
      </View>

      <Button
        title="Log in"
        loadingTitle="Logging in…"
        size="lg"
        loading={loading}
        disabled={!supabaseAvailable}
        onPress={handleLogin}
      />

      <View className="mt-6 items-center">
        <Text className="text-sm text-ink-muted">
          Don’t have an account?{" "}
          <Text
            className="font-semibold text-navy"
            onPress={() => navigation.navigate("Login3")}
            accessibilityRole="link"
          >
            Sign up
          </Text>
        </Text>
      </View>
    </AuthLayout>
  );
}
