"use client";

import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseBrowser";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
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
        const errorMessage = resetError.message || "Failed to send reset link. Please try again.";
        setError(errorMessage);
        toast({
          description: errorMessage,
          variant: "error",
        });
      } else {
        setSuccess(true);
        setEmail("");
        toast({
          description: "Reset link sent! Please check your email.",
          variant: "success",
        });
      }
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
          Reset your password
        </CardTitle>
        <CardDescription className="text-center">
          Enter your email to receive a reset link
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="Email Address"
                value={email}
                onChange={handleChange}
                disabled={loading}
                className={`pl-10 ${
                  error
                    ? "border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20"
                    : ""
                }`}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "email-error" : success ? "email-success" : undefined}
              />
            </div>
            {error && (
              <p
                id="email-error"
                className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}
            {success && !error && (
              <p
                id="email-success"
                className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Reset link sent! Please check your email.
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
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

