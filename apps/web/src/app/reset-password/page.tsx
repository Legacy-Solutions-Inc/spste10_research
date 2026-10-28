import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your AGAP account.",
};

export default function ResetPasswordPage() {
  // The recovery session comes from the email link, so it is resolved client-side
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
