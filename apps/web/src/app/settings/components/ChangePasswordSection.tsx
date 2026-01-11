"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Lock, Save, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { LucideIcon } from "lucide-react";

interface ChangePasswordSectionProps {
  icon?: LucideIcon;
  onSave: (password: string) => Promise<void>;
}

export default function ChangePasswordSection({ icon: Icon, onSave }: ChangePasswordSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ oldPassword?: string; password?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const validatePassword = (pwd: string): string | null => {
    if (!pwd || pwd.trim() === "") return "Password is required";
    if (pwd.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleOpenDialog = () => {
    setOldPassword("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!saving) {
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      setIsDialogOpen(false);
    }
  };

  const handleOldPasswordChange = (value: string) => {
    setOldPassword(value);
    if (errors.oldPassword) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.oldPassword;
        return next;
      });
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
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
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
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { oldPassword?: string; password?: string; confirmPassword?: string } = {};
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
      toast({
        description: "Please fix the errors before saving.",
        variant: "error",
      });
      return;
    }

    setSaving(true);

    try {
      await onSave(password);
      toast({
        description: "Password changed successfully!",
        variant: "success",
      });
      setTimeout(() => {
        setIsDialogOpen(false);
        setOldPassword("");
        setPassword("");
        setConfirmPassword("");
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
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
              Change Password
            </CardTitle>
          </div>
          <Button
            onClick={handleOpenDialog}
            disabled={saving}
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
          >
            <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
        <p className="text-xs md:text-sm text-muted-foreground">
          Click Edit to change your password
        </p>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <DialogTitle>Change Password</DialogTitle>
            </div>
            <DialogDescription>
              Enter your new password below. Make sure it&apos;s at least 6 characters long.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Old Password (Optional)
                </Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => handleOldPasswordChange(e.target.value)}
                  placeholder="Enter your current password"
                  disabled={saving}
                  className={
                    errors.oldPassword
                      ? "border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20"
                      : ""
                  }
                />
                {errors.oldPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {errors.oldPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter new password (minimum 6 characters)"
                  disabled={saving}
                  className={
                    errors.password
                      ? "border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20"
                      : ""
                  }
                />
                {errors.password && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={saving}
                  className={
                    errors.confirmPassword
                      ? "border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20"
                      : ""
                  }
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              onClick={handleCloseDialog}
              disabled={saving}
              variant="secondary"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
