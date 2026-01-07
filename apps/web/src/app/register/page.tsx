import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "AGAP - Create Account",
  description: "Create a new AGAP account",
};

export default async function RegisterPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white border border-blue-200 rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <h1 className="text-4xl font-extrabold text-blue-900 text-center mb-6">
          AGAP
        </h1>
        <RegisterForm />
      </div>
    </main>
  );
}

