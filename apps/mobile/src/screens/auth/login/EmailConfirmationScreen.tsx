import { View, Text, Alert } from "react-native";
import { useState } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import colors from "@/theme/colors";
import { AuthLayout } from "./components/AuthLayout";

type EmailConfirmationNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "Login5"
>;

/** Shown after sign-up when the project requires email confirmation */
export function EmailConfirmationScreen() {
  const navigation = useNavigation<EmailConfirmationNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, "Login5">>();
  const email = route.params?.email;
  const [resending, setResending] = useState(false);

  // There's no session before confirmation, so resend uses the address directly
  const resend = async () => {
    if (!supabase || !email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        Alert.alert("Couldn't resend", error.message);
      } else {
        Alert.alert("Email sent", "Check your inbox for a new confirmation link.");
      }
    } catch (err) {
      console.error("Resend email error:", err);
      Alert.alert("Couldn't resend", "Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout title="Check your email">
      <View className="items-center">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-navy-tint">
          <MaterialCommunityIcons
            name="email-outline"
            size={40}
            color={colors.navy.DEFAULT}
          />
        </View>
        <Text className="mt-4 text-center text-base leading-6 text-ink-muted">
          We sent a confirmation link to
        </Text>
        {email && (
          <Text className="text-center text-base font-semibold text-ink">
            {email}
          </Text>
        )}
        <Text className="mt-2 text-center text-base leading-6 text-ink-muted">
          Open it to activate your account, then log in.
        </Text>
      </View>

      <Button
        title="Go to log in"
        size="lg"
        onPress={() => navigation.navigate("Login2")}
        className="mt-6"
      />
      {email && (
        <Button
          title="Resend email"
          variant="ghost"
          loading={resending}
          onPress={resend}
          className="mt-2"
        />
      )}
    </AuthLayout>
  );
}
