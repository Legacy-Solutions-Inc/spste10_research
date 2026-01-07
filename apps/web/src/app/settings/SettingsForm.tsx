"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

interface ProfileData {
  id?: string;
  name?: string;
  municipality?: string;
  province?: string;
  office_address?: string;
  email?: string;
  contact_number?: string;
}

interface SettingsFormProps {
  initialData: ProfileData | null;
  userEmail: string;
}

export default function SettingsForm({ initialData, userEmail }: SettingsFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    municipality: initialData?.municipality || "",
    province: initialData?.province || "",
    officeAddress: initialData?.office_address || "",
    email: userEmail || "",
    contactNumber: initialData?.contact_number || "",
    password: "",
    confirmPassword: "",
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Track if form has changes
  useEffect(() => {
    const hasFormChanges =
      formData.name !== (initialData?.name || "") ||
      formData.municipality !== (initialData?.municipality || "") ||
      formData.province !== (initialData?.province || "") ||
      formData.officeAddress !== (initialData?.office_address || "") ||
      formData.contactNumber !== (initialData?.contact_number || "") ||
      formData.password !== "" ||
      formData.confirmPassword !== "";

    setHasChanges(hasFormChanges);
  }, [formData, initialData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    setFormData((prev) => ({
      ...prev,
      [input.name]: input.value,
    }));
    if (error) setError("");
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Validate password if provided
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      // Update password if provided
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password,
        });

        if (passwordError) {
          setError(passwordError.message);
          setLoading(false);
          return;
        }
      }

      // Update profile data
      // Note: This assumes a 'profiles' table exists in Supabase
      // If the table doesn't exist, only password updates will work
      const profileUpdate = {
        name: formData.name,
        municipality: formData.municipality,
        province: formData.province,
        office_address: formData.officeAddress,
        contact_number: formData.contactNumber,
        updated_at: new Date().toISOString(),
      };

      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            email: user.email,
            ...profileUpdate,
          });

        if (profileError) {
          // If profiles table doesn't exist, only allow password updates
          if (!formData.password) {
            setError(
              "Profile update failed. The profiles table may not be set up yet. Password updates are still available."
            );
            setLoading(false);
            return;
          }
          // If password was updated successfully, show success even if profile update failed
        }
      } catch (err) {
        // Profiles table doesn't exist - only show error if no password was updated
        if (!formData.password) {
          setError(
            "Unable to update profile. The profiles table may not be configured. Password updates are still available."
          );
          setLoading(false);
          return;
        }
      }

      setSuccess(true);
      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
      setHasChanges(false);

      // Refresh the page to get updated data
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Settings update error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto mt-6 bg-white p-6 rounded-lg shadow-md">
      {/* Name */}
      <div>
        <label className="text-sm font-medium text-blue-900 mb-1 block">
          Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter the name of the office"
          className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Municipality */}
      <div>
        <label className="text-sm font-medium text-blue-900 mb-1 block">
          Municipality
        </label>
        <input
          type="text"
          name="municipality"
          value={formData.municipality}
          onChange={handleChange}
          placeholder="Enter your municipality"
          className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Province */}
      <div>
        <label className="text-sm font-medium text-blue-900 mb-1 block">
          Province
        </label>
        <input
          type="text"
          name="province"
          value={formData.province}
          onChange={handleChange}
          placeholder="Enter your province"
          className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Office Address */}
      <div>
        <label className="text-sm font-medium text-blue-900 mb-1 block">
          Office Address
        </label>
        <input
          type="text"
          name="officeAddress"
          value={formData.officeAddress}
          onChange={handleChange}
          placeholder="Enter your office address"
          className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Email */}
      <div>
        <label className="text-sm font-medium text-blue-900 mb-1 block">
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          readOnly
          className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">
          Email cannot be changed. Contact support if you need to update it.
        </p>
      </div>

      {/* Contact Number */}
      <div>
        <label className="text-sm font-medium text-blue-900 mb-1 block">
          Contact Number
        </label>
        <input
          type="tel"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          placeholder="Enter your contact number"
          className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Password Section */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <h3 className="text-sm font-medium text-blue-900 mb-3">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-blue-900 mb-1 block">
              New Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter new password (leave blank to keep current)"
              className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-blue-900 mb-1 block">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              className="w-full py-2 px-4 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          Settings saved successfully!
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={loading || !hasChanges}
          className="bg-blue-900 text-white font-semibold py-2 px-6 rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed w-full"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

