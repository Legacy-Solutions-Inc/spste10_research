import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Get a link to reset your AGAP account password.",
};

export default function ForgotPasswordPage() {
  // Authentication check is handled by middleware
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
