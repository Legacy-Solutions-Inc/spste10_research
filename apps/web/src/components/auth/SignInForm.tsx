"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthField, fieldAria } from "@/components/auth/AuthField";
import { FormNotice } from "@/components/auth/FormNotice";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SIGN_IN_NOTICES, type SignInNotice } from "@/components/auth/sign-in-notices";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turns Supabase auth errors into copy that says what to do next. */
function signInErrorMessage(message: string | undefined) {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check both and try again.";
  }
  if (text.includes("email not confirmed")) {
    return "This email address hasn't been confirmed yet. Open the confirmation link we sent to it, then sign in.";
  }
  return message || "Couldn't sign in. Try again in a moment.";
}

export default function SignInForm({ initialNotice = null }: { initialNotice?: SignInNotice | null }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState<SignInNotice | null>(initialNotice);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear this field's error and any general error once the user edits
    if (errors[name as keyof FormErrors] || errors.general) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof FormErrors];
        delete next.general;
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const next: FormErrors = {};

    if (!formData.email.trim()) {
      next.email = "Enter your email address.";
    } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
      next.email = "Enter a valid email address, like name@example.com.";
    }

    if (!formData.password) {
      next.password = "Enter your password.";
    } else if (formData.password.length < 6) {
      next.password = "Passwords have at least 6 characters. Check what you entered.";
    }

    setErrors(next);
    if (next.email) emailRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    return Object.keys(next).length === 0;
  };

  /** Ends the session that signInWithPassword just created and shows why. */
  const turnAway = async (
    supabase: ReturnType<typeof createClient>,
    outcome: { notice: SignInNotice } | { error: string }
  ) => {
    await supabase.auth.signOut();
    if ("notice" in outcome) setNotice(outcome.notice);
    else setErrors({ general: outcome.error });
    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setNotice(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (authError) {
        setErrors({ general: signInErrorMessage(authError.message) });
        setLoading(false);
        return;
      }

      if (!data.session || !data.user) {
        setErrors({ general: "Couldn't sign in. Try again in a moment." });
        setLoading(false);
        return;
      }

      const { data: profileRaw, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profileRaw) {
        await turnAway(supabase, { error: "Couldn't verify your account. Try again in a moment." });
        return;
      }

      const role = (profileRaw as { role: string }).role;
      let destination: "/admin" | "/dashboard";

      if (role === "admin") {
        destination = "/admin";
      } else if (role === "responder") {
        const { data: responderRaw, error: responderError } = await supabase
          .from("responder_profiles")
          .select("account_status")
          .eq("id", data.user.id)
          .maybeSingle();

        if (responderError) {
          await turnAway(supabase, { error: "Couldn't check your account's approval status. Try again in a moment." });
          return;
        }

        const status = (responderRaw as { account_status: string } | null)?.account_status;
        if (status === "rejected") {
          await turnAway(supabase, { notice: "rejected" });
          return;
        }
        if (status !== "approved") {
          // No responder_profiles row yet is treated the same as pending
          await turnAway(supabase, { notice: "pending" });
          return;
        }
        destination = "/dashboard";
      } else {
        // Citizen ("user") accounts belong to the mobile app
        await turnAway(supabase, { notice: "mobile" });
        return;
      }

      // Give the auth cookies a moment to land, then do a full page load so the
      // middleware sees them. Loading stays on while the browser navigates.
      await new Promise((resolve) => setTimeout(resolve, 100));
      window.location.href = destination;
    } catch {
      setErrors({ general: "Couldn't reach AGAP. Check your internet connection and try again." });
      setLoading(false);
    }
  };

  const noticeContent = notice ? SIGN_IN_NOTICES[notice] : null;

  return (
    <div>
      <h1 className="text-28 font-semibold text-foreground">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in with your response office or administrator account.</p>

      {noticeContent && (
        <FormNotice tone={noticeContent.tone} title={noticeContent.title} className="mt-6">
          {noticeContent.body}
        </FormNotice>
      )}

      {/* method="post" keeps credentials out of the URL if someone submits before the page hydrates */}
      <form method="post" onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <AuthField id="email" label="Email" error={errors.email}>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            {...fieldAria("email", errors.email)}
          />
        </AuthField>

        <AuthField
          id="password"
          label="Password"
          error={errors.password}
          action={
            <Link
              href="/forgot-password"
              className="rounded-sm text-13 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            ref={passwordRef}
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            {...fieldAria("password", errors.password)}
          />
        </AuthField>

        {errors.general && <FormNotice tone="error">{errors.general}</FormNotice>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        New response office?{" "}
        <Link
          href="/register"
          className="rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Request access
        </Link>
      </p>
    </div>
  );
}
