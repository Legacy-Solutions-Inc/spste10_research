export type UserRole = "admin" | "responder" | "user";

export interface SettingsProfile {
  full_name: string | null;
  email: string | null;
  // Responder-only fields (from responder_profiles); always null for admins
  municipality: string | null;
  province: string | null;
  office_address: string | null;
  contact_number: string | null;
}
