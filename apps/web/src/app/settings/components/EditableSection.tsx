"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export interface EditableField {
  label: string;
  value: string | null;
  fieldKey: string;
  type?: "text" | "tel" | "email";
  placeholder?: string;
  /** Shown but never edited or saved (e.g. the sign-in email). */
  disabled?: boolean;
  validation?: (value: string) => string | null;
  helperText?: string;
  autoComplete?: string;
}

interface EditableSectionProps {
  title: string;
  description?: string;
  fields: EditableField[];
  onSave: (updates: Record<string, string | null>) => Promise<void>;
  isLoading?: boolean;
}

export default function EditableSection({
  title,
  description,
  fields,
  onSave,
  isLoading = false,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Values just saved, shown until the refreshed server data arrives as props
  const [savedValues, setSavedValues] = useState<Record<string, string | null> | null>(null);
  const { toast } = useToast();

  const idPrefix = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useRef<"first-input" | "edit-button" | null>(null);

  const fieldId = (fieldKey: string) => `${idPrefix}-${fieldKey}`;

  const propsKey = fields.map((field) => field.value ?? "").join("\u0000");
  useEffect(() => {
    setSavedValues(null);
  }, [propsKey]);

  useEffect(() => {
    if (focusAfterRender.current === "first-input") {
      formRef.current?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus();
    } else if (focusAfterRender.current === "edit-button") {
      editButtonRef.current?.focus();
    }
    focusAfterRender.current = null;
  }, [isEditing]);

  const displayValue = (field: EditableField) =>
    savedValues && savedValues[field.fieldKey] !== undefined ? savedValues[field.fieldKey] : field.value;

  const handleEdit = () => {
    const initialValues: Record<string, string> = {};
    fields.forEach((field) => {
      initialValues[field.fieldKey] = displayValue(field) || "";
    });
    setValues(initialValues);
    setErrors({});
    focusAfterRender.current = "first-input";
    setIsEditing(true);
  };

  const handleCancel = () => {
    setValues({});
    setErrors({});
    focusAfterRender.current = "edit-button";
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

  /** Returns the key of the first invalid field, or null if everything is valid. */
  const validateFields = (): string | null => {
    const newErrors: Record<string, string> = {};
    let firstInvalid: string | null = null;

    fields.forEach((field) => {
      const value = values[field.fieldKey] || "";
      if (field.validation) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.fieldKey] = error;
          firstInvalid ??= field.fieldKey;
        }
      }
    });

    setErrors(newErrors);
    return firstInvalid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const firstInvalid = validateFields();
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
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
      setSavedValues(updates);
      toast({ title: "Changes saved", variant: "success" });
      focusAfterRender.current = "edit-button";
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Couldn't save changes",
        description: error instanceof Error ? error.message : "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {!isEditing && (
            <Button
              ref={editButtonRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEdit}
              disabled={isLoading}
              aria-label={`Edit ${title.toLowerCase()}`}
            >
              <Pencil aria-hidden />
              Edit
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {fields.map((field) => {
                const id = fieldId(field.fieldKey);
                const error = errors[field.fieldKey];
                const note = error || field.helperText;
                return (
                  <div key={field.fieldKey} className="space-y-1.5">
                    <Label htmlFor={id}>{field.label}</Label>
                    <Input
                      id={id}
                      type={field.type || "text"}
                      value={values[field.fieldKey] || ""}
                      onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      disabled={field.disabled || saving}
                      autoComplete={field.autoComplete}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={note ? `${id}-note` : undefined}
                    />
                    {note && (
                      <p id={`${id}-note`} className={error ? "text-13 text-alert" : "text-13 text-muted-foreground"}>
                        {note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <dl className="divide-y">
              {fields.map((field) => {
                const value = displayValue(field);
                return (
                  <div
                    key={field.fieldKey}
                    className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                  >
                    <dt className="text-13 text-muted-foreground sm:pt-px">{field.label}</dt>
                    <dd className="min-w-0 break-words text-sm text-foreground">
                      {value || <span className="text-muted-foreground">Not set</span>}
                      {field.disabled && field.helperText && (
                        <p className="mt-0.5 text-13 text-muted-foreground">{field.helperText}</p>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </CardContent>

        {isEditing && (
          <CardFooter className="gap-2 border-t pt-4">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
