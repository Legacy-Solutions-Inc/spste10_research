"use client";

import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AuthField, fieldAria } from "@/components/auth/AuthField";
import { BackToSignIn } from "@/components/auth/BackToSignIn";
import { FormNotice } from "@/components/auth/FormNotice";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) setError("");
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Validate email
    if (!email || !email.trim()) {
      setError("Enter the email address for your account.");
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Enter a valid email address, like name@example.com.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        const errorMessage = resetError.message || "Couldn't send the reset link. Try again in a moment.";
        setError(errorMessage);
        toast({
          description: errorMessage,
          variant: "error",
        });
      } else {
        setSuccess(true);
        setEmail("");
        toast({
          description: "Reset link sent. Check your email.",
          variant: "success",
        });
      }
    } catch (err) {
      const errorMessage = "Couldn't reach AGAP. Check your internet connection and try again.";
      setError(errorMessage);
      toast({
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackToSignIn />

      <h1 className="mt-6 text-28 font-semibold text-foreground">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email address for your account and we&apos;ll send you a link to set a new password.
      </p>

      {success && !error && (
        <FormNotice tone="success" title="Check your email" className="mt-6">
          If an account uses that address, a reset link is on its way. Open it in this browser to set a new password.
        </FormNotice>
      )}

      <form method="post" onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <AuthField id="email" label="Email" error={error || undefined}>
          <Input
            id="email"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={handleChange}
            disabled={loading}
            {...fieldAria("email", error || undefined)}
          />
        </AuthField>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </div>
  );
}
