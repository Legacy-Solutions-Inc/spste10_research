"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AuthField } from "@/components/auth/AuthField";
import { BackToSignIn } from "@/components/auth/BackToSignIn";
import { FormNotice } from "@/components/auth/FormNotice";
import { PasswordInput } from "@/components/auth/PasswordInput";

type Status = "verifying" | "ready" | "invalid" | "done";

export default function ResetPasswordForm() {
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const establishRecoverySession = async () => {
      const supabase = createClient();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);

      // Expired or already-used links come back with an error instead of a session
      const urlError = hash.get("error_description") || query.get("error_description");
      if (urlError) {
        setLinkError(urlError.replace(/\+/g, " "));
        setStatus("invalid");
        return;
      }

      // Web requests use PKCE (?code=...), which the client exchanges on its own.
      // Mobile requests use the implicit flow (#access_token=...), which the PKCE
      // browser client refuses, so set that session explicitly.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setLinkError(sessionError.message);
          setStatus("invalid");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Keep tokens and codes out of the address bar and browser history
      window.history.replaceState(null, "", window.location.pathname);

      setStatus(session ? "ready" : "invalid");
    };

    establishRecoverySession();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        const errorMessage = updateError.message || "Couldn't update your password. Try again in a moment.";
        setError(errorMessage);
        toast({
          description: errorMessage,
          variant: "error",
        });
        return;
      }

      // End the recovery session so the user signs in fresh with the new password
      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setStatus("done");
      toast({
        description: "Password updated. Sign in with your new password.",
        variant: "success",
      });
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

      <h1 className="mt-6 text-28 font-semibold text-foreground">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {status === "done" ? "Your password has been changed." : "Choose a new password for your account."}
      </p>

      {status === "verifying" && (
        <p role="status" className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking your reset link…
        </p>
      )}

      {status === "invalid" && (
        <div className="mt-8 space-y-6">
          <FormNotice tone="error" title={linkError || "This reset link is invalid or has expired."}>
            Request a new link, and open it in the same browser you requested it from.
          </FormNotice>
          <Button asChild size="lg" className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      )}

      {status === "done" && (
        <div className="mt-8 space-y-6">
          <FormNotice tone="success">Password updated. Sign in with your new password.</FormNotice>
          <Button asChild size="lg" className="w-full">
            <Link href="/">Sign in</Link>
          </Button>
        </div>
      )}

      {status === "ready" && (
        <form method="post" onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
          <AuthField id="password" label="New password" hint={error ? undefined : "At least 6 characters."}>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "password-error" : "password-hint"}
            />
          </AuthField>

          <AuthField id="confirmPassword" label="Confirm new password">
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "password-error" : undefined}
            />
            {error && (
              <p id="password-error" className="text-13 text-alert">
                {error}
              </p>
            )}
          </AuthField>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Updating password…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
