-- Migration: Create responder_profiles table for responder-specific information
-- This table extends the profiles table with additional responder-specific fields
-- It has a one-to-one relationship with the profiles table

-- 1. Create account_status enum type
CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Create responder_profiles table
CREATE TABLE IF NOT EXISTS public.responder_profiles (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  municipality TEXT,
  province TEXT,
  office_address TEXT,
  contact_number TEXT,
  account_status account_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_responder_profiles_account_status ON public.responder_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_responder_profiles_municipality ON public.responder_profiles(municipality);

-- 4. Enable Row-Level Security
ALTER TABLE public.responder_profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for responder_profiles table

-- Users can read their own responder profile
CREATE POLICY "Users can read own responder profile"
  ON public.responder_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own responder profile
CREATE POLICY "Users can insert own responder profile"
  ON public.responder_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own responder profile
CREATE POLICY "Users can update own responder profile"
  ON public.responder_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read any responder profile
CREATE POLICY "Admins can read any responder profile"
  ON public.responder_profiles
  FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Admins can update any responder profile
CREATE POLICY "Admins can update any responder profile"
  ON public.responder_profiles
  FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Admins can insert any responder profile
CREATE POLICY "Admins can insert any responder profile"
  ON public.responder_profiles
  FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

-- Responders can read responder profiles (for viewing other responders)
CREATE POLICY "Responders can read responder profiles"
  ON public.responder_profiles
  FOR SELECT
  USING (public.get_user_role() = 'responder' OR public.get_user_role() = 'admin');

-- 6. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_responder_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 7. Trigger to automatically update updated_at
CREATE TRIGGER set_responder_profiles_updated_at
  BEFORE UPDATE ON public.responder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_responder_profiles_updated_at();
