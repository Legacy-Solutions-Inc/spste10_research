import { createClient } from "@/lib/supabaseServer";
import { createClient as createBrowserClient } from "@/lib/supabaseBrowser";
import type { user_role } from "@repo/types";
import type { Database } from "@repo/types";

/**
 * Server-side: Get the current user's role
 */
export async function getUserRole(): Promise<user_role | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id as any)
    .single();

  if (error || !profile || typeof profile !== "object" || !("role" in profile)) return null;

  return (profile as { role: user_role }).role || null;
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id as any)
    .single();

  if (error || !profile) return null;

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

  const userId = user.id as Database["public"]["Tables"]["profiles"]["Row"]["id"];
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

    
  if (error || !profile) return null;

  return (profile as { role: user_role }).role || null;
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id as any)
    .single();

  if (error || !profile) return null;

  return profile;
}

/**
 * Server-side: Check if user is an approved responder
 */
export async function isApprovedResponder(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: responderProfile, error } = await supabase
    .from("responder_profiles")
    .select("account_status")
    .eq("id", user.id as any)
    .single();

  if (error || !responderProfile || typeof responderProfile !== "object" || !("account_status" in responderProfile)) return false;

  return (responderProfile as { account_status: "pending" | "approved" | "rejected" }).account_status === "approved";
}

/**
 * Client-side: Check if user is an approved responder
 */
export async function isApprovedResponderClient(): Promise<boolean> {
  const supabase = createBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: responderProfile, error } = await supabase
    .from("responder_profiles")
    .select("account_status")
    .eq("id", user.id as any)
    .single();

  if (error || !responderProfile || typeof responderProfile !== "object" || !("account_status" in responderProfile)) return false;

  return (responderProfile as { account_status: "pending" | "approved" | "rejected" }).account_status === "approved";
}

/**
 * Server-side: Get responder profile
 */
export async function getResponderProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: responderProfile, error } = await supabase
    .from("responder_profiles")
    .select("*")
    .eq("id", user.id as any)
    .single();

  if (error || !responderProfile) return null;

  return responderProfile;
}

/**
 * Client-side: Get responder profile
 */
export async function getResponderProfileClient() {
  const supabase = createBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: responderProfile, error } = await supabase
    .from("responder_profiles")
    .select("*")
    .eq("id", user.id as any)
    .single();

  if (error || !responderProfile) return null;

  return responderProfile;
}
