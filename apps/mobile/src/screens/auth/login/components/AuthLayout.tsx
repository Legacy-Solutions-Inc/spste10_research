import {
  View,
  Text,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SupabaseWarning } from "./SupabaseWarning";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Brand photo with the AGAP card on top, shared by log in / sign up / reset */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <ImageBackground
        source={require("../../../../../assets/loginpage.png")}
        resizeMode="cover"
        className="flex-1"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              className="mx-2 mt-32 rounded-t-3xl bg-surface px-6 pt-8"
              style={{ paddingBottom: insets.bottom + 24 }}
            >
              <Text className="text-center text-4xl font-extrabold tracking-[0.35em] text-navy">
                AGAP
              </Text>
              <Text
                accessibilityRole="header"
                className="mt-4 text-center text-xl font-bold text-ink"
              >
                {title}
              </Text>
              {subtitle && (
                <Text className="mt-1 text-center text-sm leading-5 text-ink-muted">
                  {subtitle}
                </Text>
              )}
              {!isSupabaseConfigured() && (
                <View className="mt-4">
                  <SupabaseWarning />
                </View>
              )}
              <View className="mt-6">{children}</View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}
