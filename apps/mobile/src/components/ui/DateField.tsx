import { useState } from "react";
import { View, Text, Pressable, Modal, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import colors from "@/theme/colors";

interface DateFieldProps {
  label: string;
  /** YYYY-MM-DD, or null when empty */
  value: string | null;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
}

// Built from local date parts so the day never shifts across time zones
function toIsoDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

const DEFAULT_DATE = new Date(2000, 0, 1);

export function DateField({
  label,
  value,
  onChange,
  hint,
  placeholder = "Select a date",
}: DateFieldProps) {
  const insets = useSafeAreaInsets();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(DEFAULT_DATE);
  const date = fromIsoDate(value);
  const today = new Date();

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date ?? DEFAULT_DATE,
        mode: "date",
        maximumDate: today,
        onChange: (event, selected) => {
          if (event.type === "set" && selected) onChange(toIsoDate(selected));
        },
      });
    } else {
      setIosDraft(date ?? DEFAULT_DATE);
      setIosOpen(true);
    }
  };

  const display = date
    ? date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : placeholder;

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-semibold text-ink">{label}</Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${date ? display : "not set"}`}
        accessibilityHint="Opens a date picker"
        className="h-12 flex-row items-center justify-between rounded-xl border border-line bg-white px-4 active:bg-navy-tint"
      >
        <Text className={`text-base ${date ? "text-ink" : "text-ink-subtle"}`}>
          {display}
        </Text>
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={colors.ink.muted}
        />
      </Pressable>
      {hint && <Text className="mt-1 text-sm text-ink-subtle">{hint}</Text>}

      {Platform.OS === "ios" && (
        <Modal
          visible={iosOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIosOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View
              className="rounded-t-3xl bg-white px-6 pt-4"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="spinner"
                maximumDate={today}
                onChange={(_, selected) => selected && setIosDraft(selected)}
              />
              <Button
                title="Done"
                size="lg"
                onPress={() => {
                  onChange(toIsoDate(iosDraft));
                  setIosOpen(false);
                }}
              />
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setIosOpen(false)}
                className="mt-2"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
