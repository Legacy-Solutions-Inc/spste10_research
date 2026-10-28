"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthField, fieldAria } from "@/components/auth/AuthField";
import { BackToSignIn } from "@/components/auth/BackToSignIn";
import { FormNotice } from "@/components/auth/FormNotice";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { validatePhoneNumber, validateTextField } from "@/app/settings/utils/validation";

type FieldName =
  | "officeName"
  | "municipality"
  | "province"
  | "officeAddress"
  | "contactNumber"
  | "email"
  | "password"
  | "confirmPassword";

type FormErrors = Partial<Record<FieldName | "general", string>>;

// Order matters: the first invalid field in this order gets focus
const FIELD_ORDER: FieldName[] = [
  "officeName",
  "municipality",
  "province",
  "officeAddress",
  "contactNumber",
  "email",
  "password",
  "confirmPassword",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OFFICE_NAME_HINT = "The name your office goes by, like MDRRMO San Jose.";
const PASSWORD_HINT = "At least 6 characters.";

// signUp succeeded but the responder role or access request couldn't be written
const REQUEST_NOT_SAVED =
  "Your sign-in account was created, but your office details couldn't be saved, so the access request wasn't filed. Contact your AGAP administrator to finish setting up access for this email address.";

export default function RegisterForm() {
  const [formData, setFormData] = useState<Record<FieldName, string>>({
    officeName: "",
    municipality: "",
    province: "",
    officeAddress: "",
    contactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  // Set once the request is saved; null while the form is showing
  const [sent, setSent] = useState<{ email: string; needsEmailConfirmation: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sent) sentHeadingRef.current?.focus();
  }, [sent]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as FieldName] || errors.general) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as FieldName];
        delete next.general;
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const next: FormErrors = {};
    const value = (field: FieldName) => formData[field].trim();

    if (!value("officeName")) next.officeName = "Enter your office's name.";
    else next.officeName = validateTextField(value("officeName"), "Office name") ?? undefined;

    if (!value("municipality")) next.municipality = "Enter the municipality or city.";
    if (!value("province")) next.province = "Enter the province.";

    if (!value("officeAddress")) next.officeAddress = "Enter the office's street address.";
    else next.officeAddress = validateTextField(value("officeAddress"), "Office address") ?? undefined;

    if (!value("contactNumber")) next.contactNumber = "Enter a number where the office can be reached.";
    else next.contactNumber = validatePhoneNumber(value("contactNumber")) ?? undefined;

    if (!value("email")) next.email = "Enter an email address.";
    else if (!EMAIL_PATTERN.test(value("email"))) next.email = "Enter a valid email address, like name@example.com.";

    if (!formData.password) next.password = "Create a password.";
    else if (formData.password.length < 6) next.password = "Use at least 6 characters.";

    if (!formData.confirmPassword) next.confirmPassword = "Enter the password again.";
    else if (formData.password !== formData.confirmPassword) next.confirmPassword = "Passwords don't match.";

    const firstInvalid = FIELD_ORDER.find((field) => next[field]);
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, message]) => message)) as FormErrors;
    setErrors(cleaned);

    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`#${firstInvalid}`)?.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    setLoading(true);

    const officeName = formData.officeName.trim();
    const email = formData.email.trim();

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            full_name: officeName,
          },
        },
      });

      if (signUpError) {
        setErrors({ general: signUpError.message || "Couldn't create the account. Try again in a moment." });
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrors({ general: "Couldn't create the account. Try again in a moment." });
        setLoading(false);
        return;
      }

      // Web registration is for response offices only: mark the account as a responder
      const { error: profileError } = await supabase
        .from("profiles")
        // @ts-ignore - Supabase types may not be fully generated
        .update({ full_name: officeName, role: "responder" })
        .eq("id", data.user.id);

      if (profileError) {
        console.error("Error marking account as responder:", profileError);
        setErrors({ general: REQUEST_NOT_SAVED });
        setLoading(false);
        return;
      }

      // Then file the access request for an administrator to review
      const { error: responderProfileError } = await supabase
        .from("responder_profiles")
        // @ts-ignore - Supabase types may not be fully generated
        .insert({
          id: data.user.id,
          municipality: formData.municipality.trim(),
          province: formData.province.trim(),
          office_address: formData.officeAddress.trim(),
          contact_number: formData.contactNumber.trim(),
          account_status: "pending",
        });

      if (responderProfileError) {
        console.error("Error creating responder profile:", responderProfileError);
        setErrors({ general: REQUEST_NOT_SAVED });
        setLoading(false);
        return;
      }

      // A pending office shouldn't stay signed in (only happens when email confirmation is off)
      if (data.session) {
        await supabase.auth.signOut();
      }

      setSent({ email, needsEmailConfirmation: !data.session });
      setLoading(false);
    } catch (err) {
      console.error("Registration error:", err);
      setErrors({ general: "Couldn't reach AGAP. Check your internet connection and try again." });
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <h1 ref={sentHeadingRef} tabIndex={-1} className="text-28 font-semibold text-foreground focus:outline-none">
          Request sent
        </h1>

        {sent.needsEmailConfirmation && (
          <FormNotice tone="info" title="Confirm your email address first" className="mt-6">
            We sent a confirmation link to <span className="font-medium text-foreground">{sent.email}</span>. Open
            it to verify the address.
          </FormNotice>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          An AGAP administrator reviews every access request. You&apos;ll be able to sign in as soon as your office is
          approved.
        </p>

        <Button asChild size="lg" className="mt-8 w-full">
          <Link href="/">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  // Shared props for every input; all fields are required
  const field = (name: FieldName, hint?: string) => ({
    id: name,
    name,
    value: formData[name],
    onChange: handleChange,
    disabled: loading,
    required: true,
    ...fieldAria(name, errors[name], hint),
  });

  return (
    <div>
      <BackToSignIn />

      <h1 className="mt-6 text-28 font-semibold text-foreground">Request access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Register your response office. An AGAP administrator reviews each request before the office can sign in.
      </p>

      <form ref={formRef} method="post" onSubmit={handleSubmit} noValidate className="mt-8 space-y-8">
        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-foreground">Office details</legend>

          <AuthField id="officeName" label="Office name" error={errors.officeName} hint={OFFICE_NAME_HINT}>
            <Input {...field("officeName", OFFICE_NAME_HINT)} autoComplete="organization" />
          </AuthField>

          <div className="grid gap-5 sm:grid-cols-2">
            <AuthField id="municipality" label="Municipality or city" error={errors.municipality}>
              <Input {...field("municipality")} autoComplete="address-level2" />
            </AuthField>
            <AuthField id="province" label="Province" error={errors.province}>
              <Input {...field("province")} autoComplete="address-level1" />
            </AuthField>
          </div>

          <AuthField id="officeAddress" label="Office address" error={errors.officeAddress}>
            <Input {...field("officeAddress")} autoComplete="street-address" />
          </AuthField>

          <AuthField id="contactNumber" label="Contact number" error={errors.contactNumber}>
            <Input {...field("contactNumber")} type="tel" inputMode="tel" autoComplete="tel" />
          </AuthField>
        </fieldset>

        <Separator />

        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-foreground">Sign-in details</legend>

          <AuthField id="email" label="Email" error={errors.email}>
            <Input {...field("email")} type="email" inputMode="email" autoComplete="email" />
          </AuthField>

          <AuthField id="password" label="Password" error={errors.password} hint={PASSWORD_HINT}>
            <PasswordInput {...field("password", PASSWORD_HINT)} autoComplete="new-password" />
          </AuthField>

          <AuthField id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
            <PasswordInput {...field("confirmPassword")} autoComplete="new-password" />
          </AuthField>
        </fieldset>

        {errors.general && <FormNotice tone="error">{errors.general}</FormNotice>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Sending request…
            </>
          ) : (
            "Send request"
          )}
        </Button>
      </form>
    </div>
  );
}
