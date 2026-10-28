import { View, Text, ImageBackground } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/types";
import { Button } from "@/components/ui/Button";

type LoginNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "Login1"
>;

export function LoginScreen1() {
  const navigation = useNavigation<LoginNavigation>();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      {/* Background image */}
      <ImageBackground
        source={require("../../../../assets/loginpage.png")}
        resizeMode="cover"
        className="flex-1 justify-end"
      >
        {/* Foreground card */}
        <View
          className="mx-4 rounded-3xl bg-white px-6 pt-8 pb-6 shadow-lg"
          style={{ marginBottom: insets.bottom + 16 }}
        >
            {/* Welcome copy */}
            <View className="mb-8 items-center">
              <Text className="text-sm font-semibold text-black">
                Welcome to
              </Text>
              <Text className="mt-1 text-3xl font-extrabold tracking-[0.25em] text-navy">
                AGAP
              </Text>
              <Text className="mt-3 text-xs text-ink-muted">
                Safe. Secure.
              </Text>
              <Text className="text-xs text-ink-muted">
                Always with you.
              </Text>
            </View>

            <Button
              title="Create an account"
              onPress={() => navigation.navigate("Login3")}
              className="mb-3"
            />
            <Button
              title="I already have an account"
              variant="ghost"
              onPress={() => navigation.navigate("Login2")}
            />
        </View>
      </ImageBackground>
    </View>
  );
}