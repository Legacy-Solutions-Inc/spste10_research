import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Request access",
  description: "Request AGAP dashboard access for your emergency response office.",
};

// Signed-in users are sent away from this page by the middleware
export default function RegisterPage() {
  return (
    <AuthLayout width="wide">
      <RegisterForm />
    </AuthLayout>
  );
}
