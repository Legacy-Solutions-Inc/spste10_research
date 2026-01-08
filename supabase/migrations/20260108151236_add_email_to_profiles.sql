-- Migration: Add email column to profiles table with automatic synchronization
-- This migration adds email to profiles and keeps it in sync with auth.users.email

-- 1. Add email column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create index on email for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Backfill email for existing profiles (if any)
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS NULL;

-- 4. Update handle_new_user() function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

-- 5. Create email synchronization trigger function
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update email in profiles table when auth.users.email changes
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create trigger to sync email when auth.users.email is updated
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_update();

