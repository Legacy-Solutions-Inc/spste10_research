import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { callEmergencyHotline, EMERGENCY_HOTLINE } from "@/lib/incidents";

/** Red "Call 911" — one of the few places red is used outside SOS */
export function CallHotlineButton({ className = "" }: { className?: string }) {
  return (
    <Button
      title={`Call ${EMERGENCY_HOTLINE}`}
      variant="destructive"
      size="lg"
      onPress={callEmergencyHotline}
      icon={<MaterialCommunityIcons name="phone" size={20} color="white" />}
      className={className}
    />
  );
}
