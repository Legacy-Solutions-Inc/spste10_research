import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "AGAP - Log In",
  description: "Log in to your AGAP account",
};

export default async function LoginPage() {
  // Authentication check is handled by middleware
  return (
    <main className="min-h-screen bg-white border border-blue-200 rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <h1 className="text-4xl font-extrabold text-blue-900 text-center mb-6">
          AGAP
        </h1>
        <LoginForm />
        <Link
          href="/forgot-password"
          className="text-blue-900 text-sm hover:underline mt-2"
        >
          Forgot password?
        </Link>
      </div>
    </main>
  );
}

