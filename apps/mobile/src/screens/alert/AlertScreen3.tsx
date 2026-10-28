import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { useHardwareBack } from "@/navigation/useHardwareBack";
import { Screen } from "@/components/ui/Screen";
import { CancelAlertModal } from "@/components/CancelAlertModal";
import { useCancelAlert } from "./hooks/useCancelAlert";

type Alert3Navigation = NativeStackNavigationProp<RootStackParamList, "Alert3">;
type Alert3Route = RouteProp<RootStackParamList, "Alert3">;

export function AlertScreen3() {
  const navigation = useNavigation<Alert3Navigation>();
  const route = useRoute<Alert3Route>();
  const alertId = route.params?.alertId;
  const [showCancelModal, setShowCancelModal] = useState(false);
  // Leaving a live incident must go through Cancel
  useHardwareBack();
  const { cancelAlert, loading: cancelLoading } = useCancelAlert();

  const handleCancel = async () => {
    if (!alertId) {
      navigation.popToTop();
      return;
    }

    setShowCancelModal(false);
    const success = await cancelAlert(alertId);
    if (success) {
      navigation.popToTop();
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center items-center px-6">
        {/* Main text content - centered */}
        <View className="items-center mb-8">
          {/* Line 1: Don't worry. */}
          <Text className="text-3xl font-bold text-blue-900 text-center mb-4">
            Don't worry.
          </Text>

          {/* Line 2: We are on our way! */}
          <Text className="text-4xl font-bold text-blue-900 text-center mb-6">
            We are on our way!
          </Text>

          {/* Subtitle */}
          <Text className="text-base text-blue-700 text-center leading-6 px-4">
            Your current location is being shared to the nearest help centers
          </Text>
        </View>
      </View>

      {/* Cancel Alert button at the bottom */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          onPress={() => setShowCancelModal(true)}
          className="w-full h-14 items-center justify-center rounded-full bg-blue-900 shadow-lg"
        >
          <Text className="text-base font-bold text-white">Cancel Alert</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel Alert Modal */}
      <CancelAlertModal
        visible={showCancelModal}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </Screen>
  );
}

