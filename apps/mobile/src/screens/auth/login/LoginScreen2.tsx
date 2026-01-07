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
import { useLogin } from "./hooks/useLogin";
import { useSignUp } from "./hooks/useSignUp";
import { SupabaseWarning } from "./components/SupabaseWarning";

export function LoginScreen2() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Login2">>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading: loginLoading, supabaseAvailable } = useLogin();
  const { signUp, loading: signUpLoading } = useSignUp();

  const loading = loginLoading || signUpLoading;

  const handleLogin = () => {
    // Reuse email field for username in auth for now
    login(username, password);
  };

  const handleSignUp = () => {
    signUp(username, password);
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
          <View className="flex-1 rounded-t-3xl bg-[#f5f6fa] px-4 pt-10">
            {/* Brand */}
          <View className="items-center mb-6">
            <Text className="text-4xl font-extrabold tracking-[0.35em] text-[#0b376c]">
              AGAP
            </Text>
          </View>

          {/* Subtitle */}
          <View className="items-center mb-10">
            <Text className="text-base font-semibold text-[#0b376c]">
              Log in to your account
            </Text>
          </View>

          {/* Supabase warning (optional) */}
          {!supabaseAvailable && (
            <View className="mb-4">
              <SupabaseWarning />
            </View>
          )}

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

          {/* Password */}
          <View className="mb-2 px-2">
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

          {/* Forgot password */}
          <View className="mb-10 items-end px-2">
            <TouchableOpacity onPress={() => navigation.navigate("Login4")}>
              <Text className="text-xs font-semibold text-[#0b376c]">
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Log in button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading || !supabaseAvailable}
            className={`mt-4 h-11 items-center justify-center rounded-full border border-[#c3d2eb] bg-[#e6edf9] ${
              loading || !supabaseAvailable ? "opacity-50" : ""
            }`}
          >
            <Text className="text-sm font-semibold text-[#9aa8c6]">
              {loginLoading ? "Logging in..." : "Log in"}
            </Text>
          </TouchableOpacity>

            {/* Bottom text */}
            <View className="mt-8 items-center">
              <Text className="text-xs text-gray-500">
                Don’t have an account?{" "}
                <Text
                  className="font-semibold text-[#0b376c]"
                  onPress={() => navigation.navigate("Login3")}
                >
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
