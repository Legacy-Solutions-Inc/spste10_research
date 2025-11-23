import { createClient } from "@supabase/supabase-js";
import type { Database } from "@repo/types";

export const supabaseWeb = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

