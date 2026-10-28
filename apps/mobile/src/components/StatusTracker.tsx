import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "@/theme/colors";

export type StepState = "done" | "current" | "upcoming";

export interface TrackerStep {
  label: string;
  detail?: string;
  state: StepState;
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <MaterialCommunityIcons
        name="check-circle"
        size={28}
        color={colors.navy.DEFAULT}
      />
    );
  }
  if (state === "current") {
    return (
      <View className="h-7 w-7 items-center justify-center">
        <ActivityIndicator size="small" color={colors.navy.DEFAULT} />
      </View>
    );
  }
  return (
    <MaterialCommunityIcons
      name="circle-outline"
      size={28}
      color={colors.line}
    />
  );
}

const stateWord: Record<StepState, string> = {
  done: "done",
  current: "in progress",
  upcoming: "not yet",
};

/** Vertical step list answering "did anyone see my alert, and what's next?" */
export function StatusTracker({ steps }: { steps: TrackerStep[] }) {
  return (
    <View className="rounded-2xl bg-white px-5 py-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View
            key={step.label}
            className="flex-row"
            accessible
            accessibilityLabel={`Step ${index + 1} of ${steps.length}: ${step.label}, ${
              stateWord[step.state]
            }${step.detail ? `. ${step.detail}` : ""}`}
          >
            <View className="items-center">
              <StepIcon state={step.state} />
              {!isLast && (
                <View
                  className={`my-1 w-0.5 flex-1 ${
                    step.state === "done" ? "bg-navy" : "bg-line"
                  }`}
                  style={{ minHeight: 16 }}
                />
              )}
            </View>
            <View className={`ml-3 flex-1 ${isLast ? "" : "pb-4"}`}>
              <Text
                className={`text-base font-semibold ${
                  step.state === "upcoming" ? "text-ink-subtle" : "text-ink"
                }`}
              >
                {step.label}
              </Text>
              {step.detail && (
                <Text className="mt-0.5 text-sm text-ink-muted">
                  {step.detail}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
