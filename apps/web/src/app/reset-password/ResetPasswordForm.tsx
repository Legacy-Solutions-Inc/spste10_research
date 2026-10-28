"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseBrowser";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        const errorMessage = updateError.message || "Failed to update password. Please try again.";
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
        description: "Password updated! You can now log in.",
        variant: "success",
      });
    } catch (err) {
      const errorMessage = "An unexpected error occurred. Please try again.";
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
    <Card className="w-full max-w-sm rounded-2xl shadow-md bg-white dark:bg-slate-800 opacity-0 animate-fade-in">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
          Set a new password
        </CardTitle>
        <CardDescription className="text-center">
          {status === "done"
            ? "Your password has been changed"
            : "Choose a new password for your account"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {status === "verifying" && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying reset link...
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-4">
            <p className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {linkError || "This reset link is invalid or has expired."} Please request a new
                one, and open it in the same browser you requested it from.
              </span>
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex w-full h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Request a new link
            </Link>
          </div>
        )}

        {status === "done" && (
          <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Password updated! Log in with your new password.
          </p>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                New password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm new password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                  className={`pl-10 ${
                    error
                      ? "border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20"
                      : ""
                  }`}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "password-error" : undefined}
                />
              </div>
              {error && (
                <p
                  id="password-error"
                  className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors"
        >
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
}
