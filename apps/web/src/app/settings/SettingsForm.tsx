"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";
import EditableSection from "./components/EditableSection";
import ChangePasswordSection from "./components/ChangePasswordSection";
import { validatePhoneNumber, validateTextField } from "./utils/validation";

interface ProfileData {
  id?: string;
  full_name?: string | null;
  municipality?: string | null;
  province?: string | null;
  office_address?: string | null;
  email?: string | null;
  contact_number?: string | null;
}

interface SettingsFormProps {
  initialData: ProfileData | null;
  userEmail: string;
}

export default function SettingsForm({ initialData, userEmail }: SettingsFormProps) {
  const router = useRouter();

  const handleProfileSave = async (updates: Record<string, string | null>) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated. Please log in again.");
    }

    // Update profile (full_name)
    if (updates.full_name !== undefined) {
      const { error: profileError } = await supabase
        .from("profiles")
        // @ts-ignore - Supabase types may not be fully generated
        .update({ full_name: updates.full_name })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }
    }

    // Update responder profile fields
    const responderFields: Record<string, string | null> = {};
    if (updates.municipality !== undefined) responderFields.municipality = updates.municipality;
    if (updates.province !== undefined) responderFields.province = updates.province;
    if (updates.office_address !== undefined) responderFields.office_address = updates.office_address;

    if (Object.keys(responderFields).length > 0) {
      // Check if responder profile exists
      // @ts-ignore - Supabase types may not be fully generated
      const { data: existingResponderProfile } = await supabase
        .from("responder_profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (existingResponderProfile) {
        // Update existing responder profile
        const { error: responderError } = await supabase
          .from("responder_profiles")
          // @ts-ignore - Supabase types may not be fully generated
          .update(responderFields)
          .eq("id", user.id);

        if (responderError) {
          throw new Error(`Failed to update responder profile: ${responderError.message}`);
        }
      } else {
        // Create new responder profile
        const { error: responderError } = await supabase
          .from("responder_profiles")
          // @ts-ignore - Supabase types may not be fully generated
          .insert({
            id: user.id,
            ...responderFields,
            account_status: "pending",
          });

        if (responderError) {
          throw new Error(`Failed to create responder profile: ${responderError.message}`);
        }
      }
    }

    // Refresh the page to get updated data
    router.refresh();
  };

  const handleContactSave = async (updates: Record<string, string | null>) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated. Please log in again.");
    }

    // Update contact number in responder profile
    if (updates.contact_number !== undefined) {
      // Check if responder profile exists
      // @ts-ignore - Supabase types may not be fully generated
      const { data: existingResponderProfile } = await supabase
        .from("responder_profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (existingResponderProfile) {
        // Update existing responder profile
        const { error: responderError } = await supabase
          .from("responder_profiles")
          // @ts-ignore - Supabase types may not be fully generated
          .update({ contact_number: updates.contact_number })
          .eq("id", user.id);

        if (responderError) {
          throw new Error(`Failed to update contact number: ${responderError.message}`);
        }
      } else {
        // Create new responder profile with contact number
        const { error: responderError } = await supabase
          .from("responder_profiles")
          // @ts-ignore - Supabase types may not be fully generated
          .insert({
            id: user.id,
            contact_number: updates.contact_number,
            account_status: "pending",
          });

        if (responderError) {
          throw new Error(`Failed to create responder profile: ${responderError.message}`);
        }
      }
    }

    // Refresh the page to get updated data
    router.refresh();
  };

  const handlePasswordSave = async (password: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated. Please log in again.");
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: password,
    });

    if (passwordError) {
      throw new Error(passwordError.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Info Section */}
      <EditableSection
        title="Profile Info"
        fields={[
          {
            label: "Full Name",
            value: initialData?.full_name || null,
            fieldKey: "full_name",
            type: "text",
            placeholder: "Enter your full name",
            validation: (value) => validateTextField(value, "Full name", 100),
          },
          {
            label: "Municipality",
            value: initialData?.municipality || null,
            fieldKey: "municipality",
            type: "text",
            placeholder: "Enter your municipality",
            validation: (value) => validateTextField(value, "Municipality", 100),
          },
          {
            label: "Province",
            value: initialData?.province || null,
            fieldKey: "province",
            type: "text",
            placeholder: "Enter your province",
            validation: (value) => validateTextField(value, "Province", 100),
          },
          {
            label: "Office Address",
            value: initialData?.office_address || null,
            fieldKey: "office_address",
            type: "text",
            placeholder: "Enter your office address",
            validation: (value) => validateTextField(value, "Office address", 255),
          },
        ]}
        onSave={handleProfileSave}
      />

      {/* Contact Info Section */}
      <EditableSection
        title="Contact Info"
        fields={[
          {
            label: "Email",
            value: userEmail || initialData?.email || null,
            fieldKey: "email",
            type: "email",
            disabled: true,
            helperText: "Email cannot be changed. Contact support if you need to update it.",
          },
          {
            label: "Contact Number",
            value: initialData?.contact_number || null,
            fieldKey: "contact_number",
            type: "tel",
            placeholder: "Enter your contact number (e.g., +63 912 345 6789)",
            validation: validatePhoneNumber,
            helperText: "Format: digits and common formatting characters (spaces, dashes, parentheses)",
          },
        ]}
        onSave={handleContactSave}
      />

      {/* Change Password Section */}
      <ChangePasswordSection onSave={handlePasswordSave} />
    </div>
  );
}
