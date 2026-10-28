import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Optional single-choice reasons; the picked one is passed to onConfirm */
  reasons?: string[];
  /** The safe choice, shown as the dominant button */
  keepLabel: string;
  confirmLabel: string;
  confirming?: boolean;
  onConfirm: (reason?: string) => void;
  onKeep: () => void;
}

/**
 * Bottom-sheet confirmation where the safe choice is the filled button and the
 * irreversible one is plain text, so a hurried tap lands on "keep".
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  reasons,
  keepLabel,
  confirmLabel,
  confirming = false,
  onConfirm,
  onKeep,
}: ConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | undefined>();

  useEffect(() => {
    if (visible) setReason(undefined);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onKeep}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="rounded-t-3xl bg-white px-6 pt-6"
          style={{ paddingBottom: insets.bottom + 16 }}
          accessibilityViewIsModal
        >
          <Text
            accessibilityRole="header"
            className="text-xl font-bold text-ink"
          >
            {title}
          </Text>
          {message && (
            <Text className="mt-2 text-base leading-6 text-ink-muted">
              {message}
            </Text>
          )}

          {reasons && reasons.length > 0 && (
            <View className="mt-4 flex-row flex-wrap">
              {reasons.map((option) => {
                const selected = option === reason;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setReason(selected ? undefined : option)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className={`mb-2 mr-2 min-h-[44px] justify-center rounded-full border px-4 ${
                      selected
                        ? "border-navy bg-navy"
                        : "border-line bg-white active:bg-navy-tint"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selected ? "text-white" : "text-ink"
                      }`}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Button
            title={keepLabel}
            onPress={onKeep}
            disabled={confirming}
            size="lg"
            className="mt-6"
          />
          <Button
            title={confirmLabel}
            variant="ghost"
            loading={confirming}
            onPress={() => onConfirm(reason)}
            className="mt-2"
          />
        </View>
      </View>
    </Modal>
  );
}
