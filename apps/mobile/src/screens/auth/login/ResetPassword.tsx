import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ImageBackground,
  Alert,
} from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SupabaseWarning } from "./components/SupabaseWarning";

type ResetPasswordNav = NativeStackNavigationProp<RootStackParamList, "Login4">;

export function ResetPassword() {
  const navigation = useNavigation<ResetPasswordNav>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const supabaseAvailable = isSupabaseConfigured();

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
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
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) {
        Alert.alert("Error", error.message);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
    >
      {/* Background image */}
      <ImageBackground
        source={require("../../../../assets/loginpage.png")}
        resizeMode="cover"
        className="flex-1 justify-end"
      >
        <View className="flex-1 px-2 pt-40">
          <View className="flex-1 rounded-t-3xl bg-[#f5f6fa] px-4 pt-10 pb-8">
            {/* Brand */}
            <View className="items-center mb-4">
              <Text className="text-4xl font-extrabold tracking-[0.35em] text-[#0b376c]">
                AGAP
              </Text>
            </View>

            {/* Title */}
            <View className="items-center mb-4">
              <Text className="text-base font-semibold text-[#0b376c]">
                Forgot Password?
              </Text>
            </View>

            {/* Description */}
            <View className="items-center mb-8 px-4">
              <Text className="text-xs text-gray-600 text-center leading-5">
                Please enter your email address, and we&apos;ll send password
                reset instructions shortly.
              </Text>
            </View>

            {!supabaseAvailable && (
              <View className="mb-4">
                <SupabaseWarning />
              </View>
            )}

            {/* Email input */}
            <View className="mb-8 px-2">
              <TextInput
                className="h-11 rounded-full border border-[#1b4f8f]/40 px-4 text-sm text-gray-900 bg-white"
                placeholder="Email address"
                placeholderTextColor="#a0aec0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && supabaseAvailable}
              />
            </View>

            {/* Send button */}
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || !supabaseAvailable}
              className={`mt-2 h-11 items-center justify-center rounded-full border border-[#c3d2eb] bg-[#e6edf9] ${
                loading || !supabaseAvailable ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-[#9aa8c6]">
                {loading ? "Sending..." : "Send"}
              </Text>
            </TouchableOpacity>

            {/* Bottom text */}
            <View className="mt-10 items-center">
              <Text className="text-xs text-gray-500">
                Don&apos;t have an account?{" "}
                <Text
                  className="font-semibold text-[#0b376c]"
                  onPress={handleSignIn}
                >
                  Sign in
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
