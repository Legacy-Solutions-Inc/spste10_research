import { View, Text, Alert } from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getApiOrigin } from "@/lib/openai";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AuthLayout } from "./components/AuthLayout";

type ResetPasswordNav = NativeStackNavigationProp<RootStackParamList, "Login4">;

export function ResetPassword() {
  const navigation = useNavigation<ResetPasswordNav>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    if (!supabaseAvailable || !supabase) {
      Alert.alert(
        "Configuration Error",
        "Supabase is not configured. Please check your environment variables."
      );
      return;
    }

    setLoading(true);
    try {
      // The link opens the web app's reset page, since the mobile app has no deep link handler
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${getApiOrigin()}/reset-password`,
      });
      if (resetError) {
        Alert.alert("Error", resetError.message);
      } else {
        Alert.alert(
          "Email sent",
          "Please check your email for password reset instructions."
        );
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      console.error("reset password error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate("Login2");
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to reset it."
    >
      <TextField
        label="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(undefined);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!loading && supabaseAvailable}
        error={error}
      />

      <Button
        title="Send reset link"
        loadingTitle="Sending…"
        size="lg"
        loading={loading}
        disabled={!supabaseAvailable}
        onPress={handleSend}
        className="mt-2"
      />

      <View className="mt-6 items-center">
        <Text className="text-sm text-ink-muted">
          Remember your password?{" "}
          <Text
            className="font-semibold text-navy"
            onPress={handleSignIn}
            accessibilityRole="link"
          >
            Log in
          </Text>
        </Text>
      </View>
    </AuthLayout>
  );
}
