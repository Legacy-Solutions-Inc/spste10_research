import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import SignInForm from "@/components/auth/SignInForm";
import { parseSignInNotice } from "@/components/auth/sign-in-notices";

export const metadata: Metadata = {
  // The layout's "%s | AGAP" template skips pages in its own segment, so "/" spells it out
  title: { absolute: "Sign in | AGAP" },
  description: "Sign in to the AGAP dashboard for emergency response offices.",
};

// Signed-in users are sent to /dashboard or /admin by the middleware
export default function SignInPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <AuthLayout>
      <SignInForm initialNotice={parseSignInNotice(searchParams)} />
    </AuthLayout>
  );
}
