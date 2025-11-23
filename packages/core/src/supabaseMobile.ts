import { createClient } from "@supabase/supabase-js";
import type { Database } from "@repo/types";
import Constants from "expo-constants";

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let supabaseEnabled = true;

function getSupabaseClient() {
  // If Supabase is disabled, return null
  if (!supabaseEnabled) {
    return null;
  }

  if (!supabaseClient) {
    // Try multiple ways to get env vars (process.env and Constants.expoConfig)
    const supabaseUrl = 
      process.env.EXPO_PUBLIC_SUPABASE_URL || 
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = 
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // If env vars are missing, disable Supabase instead of throwing
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        "Supabase is not configured. The app will run without Supabase. " +
        "To enable Supabase, add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file."
      );
      supabaseEnabled = false;
      return null;
    }

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

// Create a mock Supabase client that returns safe defaults
function createMockSupabaseClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signIn: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
  } as any;
}

// Export as a getter function - returns mock client if Supabase is not configured
export const supabaseMobile = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    const client = getSupabaseClient() || createMockSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

