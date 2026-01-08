"use client";

import { useState } from "react";

interface ChangePasswordSectionProps {
  onSave: (password: string) => Promise<void>;
}

export default function ChangePasswordSection({ onSave }: ChangePasswordSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd || pwd.trim() === "") return null;
    if (pwd.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleEdit = () => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setSaveMessage(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setSaveMessage(null);
    setIsEditing(false);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
    // Re-validate confirm password if both are filled
    if (confirmPassword && value !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
    } else if (errors.confirmPassword) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
    setSaveMessage(null);
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
    if (password && value !== password) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
    }
    setSaveMessage(null);
  };

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};
    let isValid = true;

    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
      isValid = false;
    }

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    if (password && !confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) {
      setSaveMessage({ type: "error", text: "Please fix the errors before saving." });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      await onSave(password);
      setSaveMessage({ type: "success", text: "Password changed successfully!" });
      setTimeout(() => {
        setIsEditing(false);
        setPassword("");
        setConfirmPassword("");
        setSaveMessage(null);
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      setSaveMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-blue-900">Change Password</h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit
          </button>
        )}
      </div>

      {!isEditing ? (
        <p className="text-sm text-gray-500">Click Edit to change your password</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Enter new password (minimum 6 characters)"
              disabled={saving}
              className={`w-full py-2 px-4 border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.password
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              placeholder="Confirm new password"
              disabled={saving}
              className={`w-full py-2 px-4 border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.confirmPassword
                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                "Save"
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
          {saveMessage && (
            <div
              className={`px-4 py-2 rounded-md text-sm ${
                saveMessage.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {saveMessage.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
