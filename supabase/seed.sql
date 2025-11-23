-- Seed data for development
-- This file is run after migrations when using: npx supabase db reset

-- Example: Create a profiles table tied to auth.users
-- Uncomment and modify as needed:

-- CREATE TABLE IF NOT EXISTS public.profiles (
--   id UUID REFERENCES auth.users(id) PRIMARY KEY,
--   email TEXT,
--   full_name TEXT,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Enable Row Level Security
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- CREATE POLICY "Users can view own profile"
--   ON public.profiles FOR SELECT
--   USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile"
--   ON public.profiles FOR UPDATE
--   USING (auth.uid() = id);

-- CREATE POLICY "Users can insert own profile"
--   ON public.profiles FOR INSERT
--   WITH CHECK (auth.uid() = id);

-- After creating tables and running migrations, regenerate types:
-- npx supabase gen types typescript --project-id <PROJECT_ID> > packages/types/src/supabase.ts
-- Or for local: npx supabase gen types typescript --local > packages/types/src/supabase.ts

