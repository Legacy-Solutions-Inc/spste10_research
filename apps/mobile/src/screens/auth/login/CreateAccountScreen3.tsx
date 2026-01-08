import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ImageBackground,
} from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { useSignUp } from "./hooks/useSignUp";
import { SupabaseWarning } from "./components/SupabaseWarning";

export function CreateAccountScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Login3">>();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { signUp, loading: signUpLoading, supabaseAvailable } = useSignUp();

  const loading = signUpLoading;

  const handleCreateAccount = () => {
    // Basic client-side validation
    if (
      !email.trim() ||
      !username.trim() ||
      !contactNumber.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      // useSignUp already shows alerts for some errors; keep this simple
      return;
    }

    if (password !== confirmPassword) {
      // Avoid extra dependency on Alert; simple early return
      return;
    }

    // Use email + password for Supabase sign up, pass username as full_name
    signUp(email, password, username.trim());
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

            {/* Subtitle */}
            <View className="items-center mb-8">
              <Text className="text-base font-semibold text-[#0b376c]">
                Create your account
              </Text>
            </View>

            {/* Supabase warning (optional) */}
            {!supabaseAvailable && (
              <View className="mb-4">
                <SupabaseWarning />
              </View>
            )}

            {/* Email */}
            <View className="mb-3 px-2">
              <TextInput
                className="h-11 rounded-full border border-[#1b4f8f]/40 px-4 text-sm text-gray-900 bg-white"
                placeholder="Email"
                placeholderTextColor="#a0aec0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && supabaseAvailable}
              />
            </View>

            {/* Username */}
            <View className="mb-3 px-2">
              <TextInput
                className="h-11 rounded-full border border-[#1b4f8f]/40 px-4 text-sm text-gray-900 bg-white"
                placeholder="Username"
                placeholderTextColor="#a0aec0"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && supabaseAvailable}
              />
            </View>

            {/* Contact Number */}
            <View className="mb-3 px-2">
              <TextInput
                className="h-11 rounded-full border border-[#1b4f8f]/40 px-4 text-sm text-gray-900 bg-white"
                placeholder="Contact Number"
                placeholderTextColor="#a0aec0"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
                autoCorrect={false}
                editable={!loading && supabaseAvailable}
              />
            </View>

            {/* Password */}
            <View className="mb-3 px-2">
              <TextInput
                className="h-11 rounded-full border border-[#1b4f8f]/40 px-4 text-sm text-gray-900 bg-white"
                placeholder="Password"
                placeholderTextColor="#a0aec0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && supabaseAvailable}
              />
            </View>

            {/* Confirm Password */}
            <View className="mb-6 px-2">
              <TextInput
                className="h-11 rounded-full border border-[#1b4f8f]/40 px-4 text-sm text-gray-900 bg-white"
                placeholder="Confirm Password"
                placeholderTextColor="#a0aec0"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && supabaseAvailable}
              />
            </View>

            {/* Create Account button */}
            <TouchableOpacity
              onPress={handleCreateAccount}
              disabled={loading || !supabaseAvailable}
              className={`mt-2 h-11 items-center justify-center rounded-full border border-[#c3d2eb] bg-[#e6edf9] ${
                loading || !supabaseAvailable ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-[#9aa8c6]">
                {signUpLoading ? "Creating..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* Bottom text - Already have an account? */}
            <View className="mt-8 items-center">
              <Text className="text-xs text-gray-500">
                Already have an account?{" "}
                <Text
                  className="font-semibold text-[#0b376c]"
                  onPress={() => navigation.navigate("Login2")}
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
