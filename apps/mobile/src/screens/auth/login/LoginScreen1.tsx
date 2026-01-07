import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type LoginNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "Login1"
>;

export function LoginScreen1() {
  const navigation = useNavigation<LoginNavigation>();

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
        {/* Foreground card */}
        <View className="mx-4 mb-6 rounded-t-3xl bg-white px-6 pt-8 pb-10 shadow-lg">
            {/* Welcome copy */}
            <View className="mb-8 items-center">
              <Text className="text-sm font-semibold text-black">
                Welcome to
              </Text>
              <Text className="mt-1 text-3xl font-extrabold tracking-[0.25em] text-[#0b376c]">
                AGAP
              </Text>
              <Text className="mt-3 text-xs text-gray-700">
                Safe. Secure.
              </Text>
              <Text className="text-xs text-gray-700">
                Always with you.
              </Text>
            </View>

            {/* Primary CTA */}
            <TouchableOpacity
              className="mb-4 h-12 items-center justify-center rounded-full bg-blue-900 shadow-md"
              onPress={() => navigation.navigate("Login3")}
            >
              <Text className="text-sm font-semibold text-white">
                Create an account
              </Text>
            </TouchableOpacity>

            {/* Secondary CTA */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Login2")}
              className="items-center mb-6"
            >
              <Text className="text-xs font-semibold text-blue-900">
                Already have an account
              </Text>
            </TouchableOpacity>

            {/* Divider */}
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}