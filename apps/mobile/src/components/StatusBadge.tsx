import { View, Text } from "react-native";
import { STATUS_LABELS, isActiveStatus, type IncidentStatus } from "@/lib/incidents";

/** Open incidents read as navy; closed ones are neutral */
export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status as IncidentStatus] ?? status;
  const active = isActiveStatus(status);
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${
        active ? "bg-navy-tint" : "bg-surface"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          active ? "text-navy" : status === "completed" ? "text-ink" : "text-ink-subtle"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
