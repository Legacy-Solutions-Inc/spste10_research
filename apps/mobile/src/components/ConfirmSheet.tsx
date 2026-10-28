import { useEffect, useState } from "react";
import { Modal, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

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
              {reasons.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  role="radio"
                  selected={option === reason}
                  onPress={() =>
                    setReason(option === reason ? undefined : option)
                  }
                />
              ))}
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
