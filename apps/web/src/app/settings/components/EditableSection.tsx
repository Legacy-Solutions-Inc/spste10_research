"use client";

import { useState, type ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Pencil, Save, X, User, MapPin, Mail, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { LucideIcon } from "lucide-react";

interface EditableField {
  label: string;
  value: string | null;
  fieldKey: string;
  type?: "text" | "tel" | "email";
  placeholder?: string;
  disabled?: boolean;
  validation?: (value: string) => string | null;
  helperText?: string;
  icon?: LucideIcon;
}

interface EditableSectionProps {
  title: string;
  icon?: LucideIcon;
  fields: EditableField[];
  onSave: (updates: Record<string, string | null>) => Promise<void>;
  isLoading?: boolean;
}

export default function EditableSection({
  title,
  icon: Icon,
  fields,
  onSave,
  isLoading = false,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Field icon mapping
  const getFieldIcon = (fieldKey: string): LucideIcon | undefined => {
    if (fieldKey.includes("name") || fieldKey === "full_name") return User;
    if (fieldKey.includes("location") || fieldKey.includes("address") || fieldKey.includes("municipality") || fieldKey.includes("province")) return MapPin;
    if (fieldKey === "email") return Mail;
    if (fieldKey.includes("contact") || fieldKey.includes("phone")) return Phone;
    return undefined;
  };

  const handleEdit = () => {
    const initialValues: Record<string, string> = {};
    fields.forEach((field) => {
      initialValues[field.fieldKey] = field.value || "";
    });
    setValues(initialValues);
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setValues({});
    setErrors({});
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
      toast({
        description: "Please fix the errors before saving.",
        variant: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const updates: Record<string, string | null> = {};
      fields.forEach((field) => {
        // Skip disabled fields (like email)
        if (field.disabled) return;
        const value = values[field.fieldKey] || "";
        updates[field.fieldKey] = value.trim() || null;
      });

      await onSave(updates);
      toast({
        description: "Settings saved successfully!",
        variant: "success",
      });
      setTimeout(() => {
        setIsEditing(false);
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings";
      toast({
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            {Icon && (
              <Icon className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
            )}
            <CardTitle className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </CardTitle>
          </div>
          {!isEditing && (
            <Button
              onClick={handleEdit}
              disabled={isLoading}
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9"
            >
              <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 md:px-6 pb-4 md:pb-6">
        {fields.map((field, index) => {
          const FieldIcon = field.icon || getFieldIcon(field.fieldKey);
          
          return (
            <div key={field.fieldKey}>
              {index > 0 && <Separator className="my-3" />}
              <div className="space-y-1.5">
                <Label
                  htmlFor={field.fieldKey}
                  className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 md:gap-2"
                >
                  {FieldIcon && (
                    <FieldIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 dark:text-slate-400" />
                  )}
                  {field.label}
                </Label>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      id={field.fieldKey}
                      type={field.type || "text"}
                      value={values[field.fieldKey] || ""}
                      onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      disabled={field.disabled || saving}
                      className={`text-sm ${
                        errors[field.fieldKey]
                          ? "border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20"
                          : ""
                      }`}
                    />
                    {errors[field.fieldKey] && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {errors[field.fieldKey]}
                      </p>
                    )}
                    {field.helperText && !errors[field.fieldKey] && (
                      <p className="text-xs text-muted-foreground">
                        {field.helperText}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div
                      className={`text-xs md:text-sm py-1.5 md:py-2 px-2 md:px-3 rounded-md ${
                        field.disabled
                          ? "text-muted-foreground bg-slate-100 dark:bg-slate-700"
                          : "text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700/50"
                      }`}
                    >
                      {field.value || (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </div>
                    {field.helperText && (
                      <p className="text-xs text-muted-foreground">{field.helperText}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {isEditing && (
        <>
          <Separator />
          <CardContent className="pt-4 px-4 md:px-6 pb-4 md:pb-6">
            <div className="flex items-center justify-end gap-2 md:gap-3">
              <Button
                onClick={handleCancel}
                disabled={saving}
                variant="secondary"
                size="sm"
                className="text-xs md:text-sm"
              >
                <X className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="min-w-[80px] md:min-w-[100px] text-xs md:text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </>
  );
}
