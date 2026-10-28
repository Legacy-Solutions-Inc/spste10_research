import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * aria props that tie an input to its AuthField hint and error.
 * Spread onto the control: <Input {...fieldAria("email", errors.email)} />
 */
export function fieldAria(id: string, error?: string, hint?: ReactNode) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy,
  };
}

/** Label, control, then either a hint or an error. The control is passed as children. */
export function AuthField({
  id,
  label,
  error,
  hint,
  action,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  /** Shown at the end of the label row, e.g. a "Forgot password?" link. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-13 text-alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-13 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
