import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type EmailConfirmationNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "Login5"
>;

export function EmailConfirmationScreen() {
  const navigation = useNavigation<EmailConfirmationNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, "Login5">>();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState<string>(
    route.params?.email || "your email"
  );
  const supabaseAvailable = isSupabaseConfigured();

  // Check if email is confirmed when screen loads or user checks
  const checkEmailConfirmation = async () => {
    if (!supabaseAvailable) {
      Alert.alert(
        "Configuration Error",
        "Supabase is not configured. Please check your environment variables."
      );
      return;
    }

    setChecking(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase!.auth.getSession();

      if (sessionError) {
        Alert.alert("Error", sessionError.message);
        return;
      }

      if (session?.user) {
        // Check if email is confirmed
        if (session.user.email_confirmed_at) {
          Alert.alert(
            "Email Confirmed!",
            "Your email has been verified. You can now use the app.",
            [
              {
                text: "OK",
                onPress: () => navigation.replace("Home"),
              },
            ]
          );
        } else {
          Alert.alert(
            "Not Confirmed Yet",
            "Please check your email and click the confirmation link."
          );
        }
      } else {
        Alert.alert(
          "No Session",
          "Please check your email and click the confirmation link, then try again."
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      console.error("Check confirmation error:", error);
    } finally {
      setChecking(false);
    }
  };

  // Resend confirmation email
  const resendConfirmationEmail = async () => {
    if (!supabaseAvailable) {
      Alert.alert(
        "Configuration Error",
        "Supabase is not configured. Please check your environment variables."
      );
      return;
    }

    setResending(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase!.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          "Error",
          "Could not find your account. Please try signing up again."
        );
        return;
      }

      const { error } = await supabase!.auth.resend({
        type: "signup",
        email: user.email!,
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert(
        "Email Sent",
        "A new confirmation email has been sent. Please check your inbox."
      );
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      console.error("Resend email error:", error);
    } finally {
      setResending(false);
    }
  };

  // Auto-check confirmation status on mount
  useEffect(() => {
    // Try to get the user's email if available
    const getUserEmail = async () => {
      if (supabaseAvailable) {
        try {
          const {
            data: { user },
          } = await supabase!.auth.getUser();
          if (user?.email) {
            setEmail(user.email);
          }
        } catch (error) {
          console.error("Error getting user email:", error);
        }
      }
    };
    getUserEmail();
  }, [supabaseAvailable]);

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
          <View className="flex-1 rounded-t-3xl bg-[#f5f6fa] px-6 pt-10 pb-8">
            {/* Brand */}
            <View className="items-center mb-6">
              <Text className="text-4xl font-extrabold tracking-[0.35em] text-[#0b376c]">
                AGAP
              </Text>
            </View>

            {/* Email Icon */}
            <View className="items-center mb-6">
              <View className="rounded-full bg-[#e6edf9] p-6">
                <MaterialCommunityIcons
                  name="email-outline"
                  size={64}
                  color="#0b376c"
                />
              </View>
            </View>

            {/* Title */}
            <View className="items-center mb-4">
              <Text className="text-xl font-bold text-[#0b376c] text-center">
                Check Your Email
              </Text>
            </View>

            {/* Instructions */}
            <View className="mb-6">
              <Text className="text-sm text-gray-700 text-center mb-2">
                We've sent a confirmation email to:
              </Text>
              <Text className="text-sm font-semibold text-[#0b376c] text-center mb-4">
                {email}
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Please check your email and click the confirmation link to
                verify your account.
              </Text>
            </View>

            {/* Check Confirmation Button */}
            <TouchableOpacity
              onPress={checkEmailConfirmation}
              disabled={checking || !supabaseAvailable}
              className={`mt-4 h-11 items-center justify-center rounded-full border border-[#c3d2eb] bg-[#e6edf9] ${
                checking || !supabaseAvailable ? "opacity-50" : ""
              }`}
            >
              {checking ? (
                <ActivityIndicator color="#0b376c" />
              ) : (
                <Text className="text-sm font-semibold text-[#9aa8c6]">
                  I've Confirmed My Email
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend Email Button */}
            <TouchableOpacity
              onPress={resendConfirmationEmail}
              disabled={resending || !supabaseAvailable}
              className={`mt-3 h-11 items-center justify-center rounded-full border border-[#1b4f8f]/40 bg-white ${
                resending || !supabaseAvailable ? "opacity-50" : ""
              }`}
            >
              {resending ? (
                <ActivityIndicator color="#0b376c" />
              ) : (
                <Text className="text-sm font-semibold text-[#0b376c]">
                  Resend Confirmation Email
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <View className="mt-8 items-center">
              <TouchableOpacity onPress={() => navigation.navigate("Login2")}>
                <Text className="text-xs text-gray-500">
                  Back to{" "}
                  <Text className="font-semibold text-[#0b376c]">Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

