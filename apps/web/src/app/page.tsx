import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Welcome to SPSTE10 Research</h1>
        <p className="text-lg mb-4">You are authenticated!</p>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            User ID: {session.user.id}
          </p>
          <p className="text-sm text-muted-foreground">
            Email: {session.user.email}
          </p>
        </div>
      </div>
    </main>
  );
}

