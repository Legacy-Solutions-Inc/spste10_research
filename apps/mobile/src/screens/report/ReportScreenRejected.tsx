import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { useHardwareBack } from "@/navigation/useHardwareBack";
import { Screen } from "@/components/ui/Screen";

type ReportRejectedNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "ReportRejected"
>;

export function ReportScreenRejected() {
  const navigation = useNavigation<ReportRejectedNavigation>();
  useHardwareBack(() => navigation.popToTop());

  return (
    <Screen>
      <View className="flex-1 justify-center items-center px-6">
        {/* Main text content - centered */}
        <View className="items-center mb-8">
          {/* Line 1: Sorry! */}
          <Text className="text-6xl font-bold text-blue-900 text-center mb-4">
            Sorry!
          </Text>

          {/* Line 2-4: The nearest help center dismiss your report. */}
          <Text className="text-xl font-bold text-blue-900 text-center leading-7 px-4">
            The nearest help center dismiss your report.
          </Text>
        </View>
      </View>

      {/* Cancel Report button at the bottom */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          className="w-full h-14 items-center justify-center rounded-full bg-blue-900 shadow-lg"
        >
          <Text className="text-base font-bold text-white">Cancel Report</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

