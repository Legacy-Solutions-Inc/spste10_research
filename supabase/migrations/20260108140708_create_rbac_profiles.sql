-- Supabase RBAC Schema Migration
-- Creates profiles table with role-based access control for user, responder, and admin roles

-- 1. Create user_role enum type
CREATE TYPE user_role AS ENUM ('user', 'responder', 'admin');

-- 2. Create profiles table extending auth.users
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create index on role for efficient role-based queries
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- 4. Enable Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- 6. RLS Policies for profiles table

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can read any profile
CREATE POLICY "Admins can read any profile"
  ON public.profiles
  FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Admins can insert any profile
CREATE POLICY "Admins can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

-- Responders can read profiles (for viewing user info on alerts/reports)
CREATE POLICY "Responders can read profiles"
  ON public.profiles
  FOR SELECT
  USING (public.get_user_role() = 'responder' OR public.get_user_role() = 'admin');

-- 7. Automatic profile creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- FUTURE TABLES: Example RLS Policies for alerts/reports tables
-- ============================================================================
-- 
-- When creating alerts/reports tables and responder_assignments junction table,
-- use these policies as a reference:
--
-- Example responder_assignments table structure:
-- CREATE TABLE public.responder_assignments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
--   responder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
--   assigned_at TIMESTAMPTZ DEFAULT NOW(),
--   status TEXT DEFAULT 'pending',
--   UNIQUE(alert_id, responder_id)
-- );
--
-- Example alerts/reports table RLS policies:
--
-- -- Users can only see their own alerts/reports
-- CREATE POLICY "Users can read own alerts"
--   ON public.alerts
--   FOR SELECT
--   USING (
--     auth.uid() = user_id OR
--     public.get_user_role() = 'admin' OR
--     EXISTS (
--       SELECT 1 FROM public.responder_assignments
--       WHERE alert_id = alerts.id
--       AND responder_id = auth.uid()
--     )
--   );
--
-- -- Users can insert their own alerts/reports
-- CREATE POLICY "Users can insert own alerts"
--   ON public.alerts
--   FOR INSERT
--   WITH CHECK (
--     auth.uid() = user_id AND
--     public.get_user_role() = 'user'
--   );
--
-- -- Users can update their own alerts/reports
-- CREATE POLICY "Users can update own alerts"
--   ON public.alerts
--   FOR UPDATE
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
--
-- -- Responders can read alerts/reports assigned to them
-- CREATE POLICY "Responders can read assigned alerts"
--   ON public.alerts
--   FOR SELECT
--   USING (
--     public.get_user_role() = 'responder' AND
--     EXISTS (
--       SELECT 1 FROM public.responder_assignments
--       WHERE alert_id = alerts.id
--       AND responder_id = auth.uid()
--     )
--   );
--
-- -- Admins can read all alerts/reports
-- CREATE POLICY "Admins can read all alerts"
--   ON public.alerts
--   FOR SELECT
--   USING (public.get_user_role() = 'admin');
--
-- -- Admins can update any alerts/reports
-- CREATE POLICY "Admins can update any alerts"
--   ON public.alerts
--   FOR UPDATE
--   USING (public.get_user_role() = 'admin')
--   WITH CHECK (public.get_user_role() = 'admin');
--
-- -- Admins can delete any alerts/reports
-- CREATE POLICY "Admins can delete any alerts"
--   ON public.alerts
--   FOR DELETE
--   USING (public.get_user_role() = 'admin');
--
-- Example responder_assignments RLS policies:
--
-- -- Responders can read their own assignments
-- CREATE POLICY "Responders can read own assignments"
--   ON public.responder_assignments
--   FOR SELECT
--   USING (
--     responder_id = auth.uid() OR
--     public.get_user_role() = 'admin'
--   );
--
-- -- Admins can manage all assignments
-- CREATE POLICY "Admins can manage assignments"
--   ON public.responder_assignments
--   FOR ALL
--   USING (public.get_user_role() = 'admin')
--   WITH CHECK (public.get_user_role() = 'admin');
--
-- ============================================================================
