import { supabase } from "@/lib/supabase";

/**
 * The signed-in user's id from the stored session. Unlike auth.getUser() this
 * needs no network round trip, which would otherwise hold the auth lock in
 * front of time-critical requests such as the alert insert.
 */
export async function currentUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) {
    throw new Error("You're signed out. Log in again.");
  }
  return id;
}
