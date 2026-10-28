import { View, Image, StyleSheet } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/types";
import { Button } from "@/components/ui/Button";
import colors from "@/theme/colors";

type Report2Navigation = NativeStackNavigationProp<
  RootStackParamList,
  "Report2"
>;
type Report2RouteProp = RouteProp<RootStackParamList, "Report2">;

/** Photo preview: retake or continue to the review screen */
export function ReportScreen2() {
  const navigation = useNavigation<Report2Navigation>();
  const route = useRoute<Report2RouteProp>();
  const { imageUri, timestamp } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <Image
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="contain"
        accessibilityLabel="Photo you just took"
      />

      <View
        className="absolute left-0 right-0 flex-row px-6"
        style={{ bottom: insets.bottom + 24 }}
      >
        <Button
          title="Retake"
          variant="inverse"
          size="lg"
          onPress={() => navigation.goBack()}
          icon={
            <MaterialCommunityIcons
              name="camera-retake"
              size={20}
              color={colors.navy.DEFAULT}
            />
          }
          className="mr-3 flex-1"
        />
        <Button
          title="Use photo"
          size="lg"
          onPress={() => navigation.navigate("Report3", { imageUri, timestamp })}
          className="flex-1"
        />
      </View>
    </View>
  );
}
