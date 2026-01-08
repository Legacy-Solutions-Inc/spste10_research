-- Migration: Create user_profiles table for extended user profile information
-- This table extends the profiles table with additional user-specific fields needed for the Profile screen
-- It has a one-to-one relationship with the profiles table

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  address TEXT,
  birthday DATE,
  age INTEGER,
  blood_type TEXT,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_blood_type ON public.user_profiles(blood_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON public.user_profiles(gender);

-- 3. Enable Row-Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create a function to automatically calculate age from birthday
CREATE OR REPLACE FUNCTION public.calculate_age(birth_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$;

-- 5. Optional: Add constraint to validate age if birthday is provided
-- This ensures data consistency but is optional
-- ALTER TABLE public.user_profiles
-- ADD CONSTRAINT check_age_birthday_consistency 
-- CHECK (birthday IS NULL OR age IS NULL OR age = public.calculate_age(birthday));

-- 6. RLS Policies for user_profiles table

-- Users can read their own user profile
CREATE POLICY "Users can read own user profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own user profile
CREATE POLICY "Users can insert own user profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own user profile
CREATE POLICY "Users can update own user profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read any user profile
CREATE POLICY "Admins can read any user profile"
  ON public.user_profiles
  FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Admins can update any user profile
CREATE POLICY "Admins can update any user profile"
  ON public.user_profiles
  FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Responders can read user profiles (for viewing user info on alerts/reports)
CREATE POLICY "Responders can read user profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.get_user_role() = 'responder' OR public.get_user_role() = 'admin');

-- 7. Create trigger to automatically update updated_at timestamp
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

