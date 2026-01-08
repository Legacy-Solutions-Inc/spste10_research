"use client";

import { useState, type ReactNode } from "react";

interface EditableField {
  label: string;
  value: string | null;
  fieldKey: string;
  type?: "text" | "tel" | "email";
  placeholder?: string;
  disabled?: boolean;
  validation?: (value: string) => string | null;
  helperText?: string;
}

interface EditableSectionProps {
  title: string;
  fields: EditableField[];
  onSave: (updates: Record<string, string | null>) => Promise<void>;
  isLoading?: boolean;
}

export default function EditableSection({
  title,
  fields,
  onSave,
  isLoading = false,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleEdit = () => {
    const initialValues: Record<string, string> = {};
    fields.forEach((field) => {
      initialValues[field.fieldKey] = field.value || "";
    });
    setValues(initialValues);
    setErrors({});
    setSaveMessage(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setValues({});
    setErrors({});
    setSaveMessage(null);
    setIsEditing(false);
  };

  const handleChange = (fieldKey: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
    // Clear error for this field
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
    setSaveMessage(null);
  };

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach((field) => {
      const value = values[field.fieldKey] || "";
      if (field.validation) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.fieldKey] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateFields()) {
      setSaveMessage({ type: "error", text: "Please fix the errors before saving." });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const updates: Record<string, string | null> = {};
      fields.forEach((field) => {
        // Skip disabled fields (like email)
        if (field.disabled) return;
        const value = values[field.fieldKey] || "";
        updates[field.fieldKey] = value.trim() || null;
      });

      await onSave(updates);
      setSaveMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => {
        setIsEditing(false);
        setSaveMessage(null);
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings";
      setSaveMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-blue-900">{title}</h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.fieldKey}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <>
                <input
                  type={field.type || "text"}
                  value={values[field.fieldKey] || ""}
                  onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  disabled={field.disabled || saving}
                  className={`w-full py-2 px-4 border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errors[field.fieldKey]
                      ? "border-red-300 focus:ring-red-500 bg-red-50"
                      : "border-gray-300 focus:ring-blue-500"
                  } ${field.disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
                />
                {errors[field.fieldKey] && (
                  <p className="text-xs text-red-600 mt-1">{errors[field.fieldKey]}</p>
                )}
                {field.helperText && !errors[field.fieldKey] && (
                  <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>
                )}
              </>
            ) : (
              <div>
                <p className={`text-sm py-2 px-4 rounded-md ${
                  field.disabled 
                    ? "text-gray-600 bg-gray-100" 
                    : "text-gray-900 bg-gray-50"
                }`}>
                  {field.value || <span className="text-gray-400 italic">Not set</span>}
                </p>
                {field.helperText && (
                  <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

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
