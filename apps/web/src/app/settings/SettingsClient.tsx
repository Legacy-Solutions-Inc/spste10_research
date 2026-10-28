import { AppShell, PageHeader } from "@/components/AppShell";
import SettingsForm from "./SettingsForm";
import type { SettingsProfile, UserRole } from "./types";

interface SettingsClientProps {
  initialData: SettingsProfile;
  userEmail: string;
  role: UserRole | null;
}

export default function SettingsClient({ initialData, userEmail, role }: SettingsClientProps) {
  const isResponder = role === "responder";

  return (
    <AppShell>
      <div className="max-w-2xl px-8 py-8">
        <PageHeader
          title="Settings"
          description={
            isResponder
              ? "Manage your office details, alerts, and password."
              : "Manage your name and password."
          }
        />
        <SettingsForm initialData={initialData} userEmail={userEmail} role={role} />
      </div>
    </AppShell>
  );
}
