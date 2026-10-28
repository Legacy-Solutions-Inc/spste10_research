"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";
import EditableSection from "./components/EditableSection";
import ChangePasswordSection from "./components/ChangePasswordSection";
import AlertsSection from "./components/AlertsSection";
import { validatePhoneNumber, validateTextField } from "./utils/validation";
import type { SettingsProfile, UserRole } from "./types";

interface SettingsFormProps {
  initialData: SettingsProfile;
  userEmail: string;
  role: UserRole | null;
}

type SupabaseBrowserClient = ReturnType<typeof createClient>;

const SAVE_FAILED = "Nothing was saved. Check your connection and try again.";
const EMAIL_HELPER = "Used to sign in. It can't be changed here.";

async function requireUserId(supabase: SupabaseBrowserClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Your session has ended. Sign in again, then retry.");
  }
  return user.id;
}

/**
 * Updates the signed-in responder's own office row. Never inserts: a missing row
 * means the account wasn't set up as a responder, and creating one here would
 * file a bogus access request.
 */
async function updateOwnResponderProfile(
  supabase: SupabaseBrowserClient,
  userId: string,
  fields: Record<string, string | null>
): Promise<void> {
  const { data, error } = await supabase
    .from("responder_profiles")
    // @ts-ignore - generated types lack Relationships, so Update resolves to never
    .update(fields)
    .eq("id", userId)
    .select("id");

  if (error) {
    console.error("Error updating responder profile:", error);
    throw new Error(SAVE_FAILED);
  }
  if (!data || data.length === 0) {
    throw new Error("We couldn't find your office profile, so nothing was saved. Contact your AGAP administrator.");
  }
}

export default function SettingsForm({ initialData, userEmail, role }: SettingsFormProps) {
  const router = useRouter();
  const isResponder = role === "responder";
  const email = userEmail || initialData.email || null;

  const handleProfileSave = async (updates: Record<string, string | null>) => {
    const supabase = createClient();
    const userId = await requireUserId(supabase);

    // full_name lives on profiles (responder_profiles doesn't have it)
    if (updates.full_name !== undefined) {
      const { error: profileError } = await supabase
        .from("profiles")
        // @ts-ignore - generated types lack Relationships, so Update resolves to never
        .update({ full_name: updates.full_name })
        .eq("id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        throw new Error(SAVE_FAILED);
      }
    }

    if (isResponder) {
      const responderFields: Record<string, string | null> = {};
      if (updates.municipality !== undefined) responderFields.municipality = updates.municipality;
      if (updates.province !== undefined) responderFields.province = updates.province;
      if (updates.office_address !== undefined) responderFields.office_address = updates.office_address;

      if (Object.keys(responderFields).length > 0) {
        await updateOwnResponderProfile(supabase, userId, responderFields);

        // The saved map location belongs to the old address; clear it so the dashboard
        // looks the office up again. Best effort: older databases don't have these columns.
        await supabase
          .from("responder_profiles")
          // @ts-ignore - generated types lack Relationships, so Update resolves to never
          .update({ office_latitude: null, office_longitude: null })
          .eq("id", userId);
      }
    }

    // Refresh the page to get updated data
    router.refresh();
  };

  const handleContactSave = async (updates: Record<string, string | null>) => {
    // Only responders have a contact number; the section isn't shown to anyone else
    if (!isResponder) return;

    const supabase = createClient();
    const userId = await requireUserId(supabase);

    if (updates.contact_number !== undefined) {
      await updateOwnResponderProfile(supabase, userId, { contact_number: updates.contact_number });
    }

    router.refresh();
  };

  const handlePasswordSave = async (password: string) => {
    const supabase = createClient();
    await requireUserId(supabase);

    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      throw new Error(passwordError.message);
    }
  };

  if (!isResponder) {
    return (
      <div className="space-y-6">
        <EditableSection
          title="Profile"
          description="Your name appears in the sidebar."
          fields={[
            {
              label: "Name",
              value: initialData.full_name,
              fieldKey: "full_name",
              type: "text",
              placeholder: "Your name",
              autoComplete: "name",
              validation: (value) => validateTextField(value, "Name", 100),
            },
            {
              label: "Email",
              value: email,
              fieldKey: "email",
              type: "email",
              disabled: true,
              helperText: EMAIL_HELPER,
            },
          ]}
          onSave={handleProfileSave}
        />
        <ChangePasswordSection onSave={handlePasswordSave} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EditableSection
        title="Office profile"
        description="Your office name and where it's located."
        fields={[
          {
            label: "Office name",
            value: initialData.full_name,
            fieldKey: "full_name",
            type: "text",
            placeholder: "e.g. MDRRMO Santa Rosa",
            autoComplete: "organization",
            validation: (value) => validateTextField(value, "Office name", 100),
          },
          {
            label: "Municipality",
            value: initialData.municipality,
            fieldKey: "municipality",
            type: "text",
            placeholder: "Municipality or city",
            validation: (value) => validateTextField(value, "Municipality", 100),
          },
          {
            label: "Province",
            value: initialData.province,
            fieldKey: "province",
            type: "text",
            placeholder: "Province",
            validation: (value) => validateTextField(value, "Province", 100),
          },
          {
            label: "Office address",
            value: initialData.office_address,
            fieldKey: "office_address",
            type: "text",
            placeholder: "Street, barangay",
            autoComplete: "street-address",
            validation: (value) => validateTextField(value, "Office address", 255),
          },
        ]}
        onSave={handleProfileSave}
      />

      <EditableSection
        title="Contact"
        description="How AGAP administrators can reach your office."
        fields={[
          {
            label: "Email",
            value: email,
            fieldKey: "email",
            type: "email",
            disabled: true,
            helperText: EMAIL_HELPER,
          },
          {
            label: "Contact number",
            value: initialData.contact_number,
            fieldKey: "contact_number",
            type: "tel",
            placeholder: "e.g. +63 912 345 6789",
            autoComplete: "tel",
            validation: validatePhoneNumber,
            helperText: "Digits, spaces, dashes, and parentheses are fine.",
          },
        ]}
        onSave={handleContactSave}
      />

      <AlertsSection />

      <ChangePasswordSection onSave={handlePasswordSave} />
    </div>
  );
}
