import { createClient } from "@/lib/supabaseServer";
import { createClient as createBrowserClient } from "@/lib/supabaseBrowser";
import type { user_role } from "@repo/types";

/**
 * Server-side: Get the current user's role
 */
export async function getUserRole(): Promise<user_role | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role || null;
}

/**
 * Server-side: Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin";
}

/**
 * Server-side: Check if user is responder
 */
export async function isResponder(): Promise<boolean> {
  const role = await getUserRole();
  return role === "responder" || role === "admin";
}

/**
 * Server-side: Get user profile
 */
export async function getUserProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Client-side: Get the current user's role
 */
export async function getUserRoleClient(): Promise<user_role | null> {
  const supabase = createBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role || null;
}

/**
 * Client-side: Check if user is admin
 */
export async function isAdminClient(): Promise<boolean> {
  const role = await getUserRoleClient();
  return role === "admin";
}

/**
 * Client-side: Get user profile
 */
export async function getUserProfileClient() {
  const supabase = createBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

