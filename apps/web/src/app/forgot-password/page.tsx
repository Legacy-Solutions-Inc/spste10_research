import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "AGAP - Reset Password",
  description: "Reset your AGAP account password",
};

export default async function ForgotPasswordPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Optionally redirect if already logged in
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white border border-blue-200 rounded-xl flex items-center justify-center px-4">
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold text-blue-900 mb-6 text-center">
          Reset Password
        </h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Enter your email to receive a reset link
        </p>
        <ForgotPasswordForm />
        <Link
          href="/login"
          className="text-blue-900 text-sm hover:underline mt-4"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}

