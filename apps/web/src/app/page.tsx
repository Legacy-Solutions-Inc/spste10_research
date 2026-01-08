import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "AGAP - Welcome",
  description: "Welcome to AGAP",
};

export default async function Home() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="bg-white border border-blue-200 rounded-xl flex items-center justify-center p-12 w-full h-screen">
        <div className="flex flex-col items-center w-full">
          <h1 className="text-6xl font-extrabold text-blue-900 text-center mb-8">
            AGAP
          </h1>
          <div className="flex flex-col space-y-4 w-full items-center">
            <Link
              href="/register"
              className="bg-blue-900 text-white text-sm font-semibold rounded-full shadow-md py-3 px-6 w-[250px] text-center transition hover:opacity-90"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="bg-blue-900 text-white text-sm font-semibold rounded-full shadow-md py-3 px-6 w-[250px] text-center transition hover:opacity-90"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

