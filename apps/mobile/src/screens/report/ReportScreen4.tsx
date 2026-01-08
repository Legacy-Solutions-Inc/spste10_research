import { View, Text, TouchableOpacity, Animated } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";
import { CancelAlertModal } from "@/components/CancelAlertModal";
import { useCheckReportStatus } from "./hooks/useCheckReportStatus";
import { useCancelReport } from "./hooks/useCancelReport";

type Report4Navigation = NativeStackNavigationProp<RootStackParamList, "Report4">;
type Report4Route = RouteProp<RootStackParamList, "Report4">;

export function ReportScreen4() {
  const navigation = useNavigation<Report4Navigation>();
  const route = useRoute<Report4Route>();
  const reportId = route.params?.reportId;
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const { status, loading: statusLoading } = useCheckReportStatus(reportId || null, !!reportId);
  const { cancelReport, loading: cancelLoading } = useCancelReport();
  
  // Animated values for concentric circles
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const scale4 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.6)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;
  const opacity4 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Animate concentric circles expanding outward
    const animateCircle = (
      scale: Animated.Value,
      opacity: Animated.Value,
      initialOpacity: number,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 3,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: initialOpacity,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const animations = [
      animateCircle(scale1, opacity1, 0.6, 0),
      animateCircle(scale2, opacity2, 0.4, 300),
      animateCircle(scale3, opacity3, 0.3, 600),
      animateCircle(scale4, opacity4, 0.2, 900),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, []);

  // Navigate based on report status
  useEffect(() => {
    if (!status) return;

    if (status.status === "accepted" || status.responseStatus === "accepted") {
      navigation.navigate("Report5", { reportId });
    } else if (status.status === "rejected" || status.responseStatus === "rejected") {
      navigation.navigate("ReportRejected");
    } else if (status.status === "canceled") {
      navigation.navigate("Home");
    }
  }, [status, navigation, reportId]);

  const handleCancel = async () => {
    if (!reportId) {
      navigation.navigate("Home");
      return;
    }

    setShowCancelModal(false);
    const success = await cancelReport(reportId);
    if (success) {
      navigation.navigate("Home");
    }
  };

  return (
    <View className="flex-1 bg-[#0b376c] justify-center items-center px-6 pt-20">
      {/* Title */}
      <Text className="text-6xl font-extrabold text-white text-center mb-4">
        Report
      </Text>

      {/* Subtitle */}
      <Text className="text-lg text-white text-center mb-20 px-4 leading-6">
        nearby rescue services would see you call for help
      </Text>

      {/* Alert Icon with concentric circles */}
      <View className="items-center justify-center mb-20">
        <View className="h-48 w-48 items-center justify-center relative">
          {/* Concentric circles radiating outward */}
          <Animated.View
            className="absolute h-48 w-48 rounded-full border-2 border-white"
            style={{
              transform: [{ scale: scale4 }],
              opacity: opacity4,
            }}
          />
          <Animated.View
            className="absolute h-48 w-48 rounded-full border-2 border-white"
            style={{
              transform: [{ scale: scale3 }],
              opacity: opacity3,
            }}
          />
          <Animated.View
            className="absolute h-48 w-48 rounded-full border-2 border-white"
            style={{
              transform: [{ scale: scale2 }],
              opacity: opacity2,
            }}
          />
          <Animated.View
            className="absolute h-48 w-48 rounded-full border-2 border-white"
            style={{
              transform: [{ scale: scale1 }],
              opacity: opacity1,
            }}
          />

          {/* Central octagon icon with exclamation mark */}
          <View className="h-32 w-32 items-center justify-center relative">
            {/* Octagon shape - using alert-octagon icon */}
            <MaterialCommunityIcons
              name="alert-octagon"
              size={128}
              color="white"
              style={{ position: "absolute" }}
            />
          </View>
        </View>
      </View>

      {/* Cancel Report button */}
      <TouchableOpacity
        onPress={() => setShowCancelModal(true)}
        className="w-full max-w-xs h-14 items-center justify-center rounded-2xl bg-white"
      >
        <Text className="text-lg font-bold text-[#0b376c]">Cancel Report</Text>
      </TouchableOpacity>

      {/* Cancel Alert Modal */}
      <CancelAlertModal
        visible={showCancelModal}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </View>
  );
}

