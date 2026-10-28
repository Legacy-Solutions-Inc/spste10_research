"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const MIN_PASSWORD_LENGTH = 6;

interface ChangePasswordSectionProps {
  onSave: (password: string) => Promise<void>;
}

type PasswordErrors = { password?: string; confirmPassword?: string };

export default function ChangePasswordSection({ onSave }: ChangePasswordSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const validatePassword = (pwd: string): string | null => {
    if (!pwd || pwd.trim() === "") return "Enter a new password.";
    if (pwd.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    return null;
  };

  const resetFields = () => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const handleOpenDialog = () => {
    resetFields();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!saving) {
      resetFields();
      setIsDialogOpen(false);
    }
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
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords don't match." }));
    } else if (errors.confirmPassword && value === confirmPassword) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.confirmPassword;
        return next;
      });
    }
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
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords don't match." }));
    }
  };

  const validate = (): PasswordErrors => {
    const newErrors: PasswordErrors = {};

    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match.";
    }

    if (password && !confirmPassword) {
      newErrors.confirmPassword = "Confirm your new password.";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const newErrors = validate();
    if (newErrors.password || newErrors.confirmPassword) {
      document.getElementById(newErrors.password ? "new-password" : "confirm-password")?.focus();
      return;
    }

    setSaving(true);

    try {
      await onSave(password);
      toast({ title: "Password changed", variant: "success" });
      resetFields();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Couldn't change password",
        description: error instanceof Error ? error.message : "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle>Password</CardTitle>
            <CardDescription>Change the password you use to sign in to AGAP.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleOpenDialog}>
            <KeyRound aria-hidden />
            Change password
          </Button>
        </CardHeader>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleCloseDialog())}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>
                Use at least {MIN_PASSWORD_LENGTH} characters. You&apos;ll use the new password the next time you sign in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={saving}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "new-password-error" : undefined}
                />
                {errors.password && (
                  <p id="new-password-error" className="text-13 text-alert">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  disabled={saving}
                  aria-invalid={errors.confirmPassword ? true : undefined}
                  aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="text-13 text-alert">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                {saving ? "Changing…" : "Change password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
