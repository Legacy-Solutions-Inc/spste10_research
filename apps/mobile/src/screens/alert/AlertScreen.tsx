import { View, Text, TouchableOpacity, Modal, Animated, PanResponder } from "react-native";
import { useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/types";

type AlertNavigation = NativeStackNavigationProp<RootStackParamList, "Alert">;

export function AlertScreen() {
  const navigation = useNavigation<AlertNavigation>();
  const [sliderValue, setSliderValue] = useState(0);
  const sliderWidth = 280; // Approximate slider track width
  const handleSize = 32;
  const maxX = sliderWidth - handleSize;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: 0,
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const currentX = (pan.x as any)._value + gestureState.dx;
        const newX = Math.max(0, Math.min(maxX, currentX));
        pan.x.setValue(newX);
        const percentage = (newX / maxX) * 100;
        setSliderValue(percentage);
      },
      onPanResponderRelease: () => {
        const finalValue = (pan.x as any)._value;
        pan.flattenOffset();
        if ((finalValue / maxX) * 100 >= 90) {
          // Alert sent - navigate to AlertScreen2
          navigation.navigate("Alert2");
        } else {
          // Reset slider if not completed
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          setSliderValue(0);
        }
      },
    })
  ).current;

  return (
    <View className="flex-1 bg-[#0b376c]">
      {/* Modal */}
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          {/* Icon */}
          <View className="items-center mb-6">
            <View className="h-32 w-32 rounded-full bg-[#0b376c] border-[6px] border-gray-300 items-center justify-center relative">
              <MaterialCommunityIcons
                name="alert"
                size={60}
                color="white"
              />
              {/* Sound wave lines - curved on both sides */}
              <View className="absolute -left-6 top-1/2" style={{ transform: [{ translateY: -16 }] }}>
                <View className="h-8 w-1 bg-white rounded-full opacity-70" />
              </View>
              <View className="absolute -left-10 top-1/2" style={{ transform: [{ translateY: -12 }] }}>
                <View className="h-6 w-1 bg-white rounded-full opacity-50" />
              </View>
              <View className="absolute -right-6 top-1/2" style={{ transform: [{ translateY: -16 }] }}>
                <View className="h-8 w-1 bg-white rounded-full opacity-70" />
              </View>
              <View className="absolute -right-10 top-1/2" style={{ transform: [{ translateY: -12 }] }}>
                <View className="h-6 w-1 bg-white rounded-full opacity-50" />
              </View>
            </View>
          </View>

          {/* Title */}
          <Text className="text-2xl font-extrabold text-[#0b376c] text-center mb-8">
            Emergency Alert
          </Text>

          {/* Slider */}
          <View className="mb-4">
            <View className="h-3 bg-gray-200 rounded-full relative" style={{ width: sliderWidth }}>
              <Animated.View
                className="absolute left-0 h-3 bg-[#0b376c] rounded-full"
                style={{
                  width: pan.x.interpolate({
                    inputRange: [0, maxX],
                    outputRange: [0, maxX],
                    extrapolate: "clamp",
                  }),
                }}
              />
              <Animated.View
                {...panResponder.panHandlers}
                className="absolute h-8 w-8 rounded-full bg-[#0b376c] border-2 border-white shadow-lg"
                style={{
                  transform: [
                    { translateX: pan.x },
                    { translateY: -2.5 },
                  ],
                }}
              />
            </View>
          </View>

          {/* Slider text */}
          <Text className="text-sm text-gray-600 text-center mb-8">
            Slide to send alert
          </Text>

          {/* BACK button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="h-12 items-center justify-center rounded-xl border-2 border-[#0b376c] bg-white"
          >
            <Text className="text-base font-semibold text-[#0b376c]">BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

