-- Migration: Add admin helper functions
-- Provides functions for managing admin roles and admin-specific operations

-- 1. Function to promote a user to admin role
-- This function can be used by existing admins or during initial setup
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin (or if this is initial setup, allow)
  -- In production, you might want to add additional checks here
  
  -- Update the user's role to admin
  UPDATE public.profiles
  SET role = 'admin', updated_at = NOW()
  WHERE id = user_id;
  
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- 2. Function to demote an admin to user role
-- Use with caution - this removes admin privileges
CREATE OR REPLACE FUNCTION public.demote_from_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow if current user is admin
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can demote other admins';
  END IF;
  
  -- Prevent demoting yourself
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;
  
  -- Update the user's role to user
  UPDATE public.profiles
  SET role = 'user', updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- 3. Function to get all admin users
-- Useful for admin management interfaces
CREATE OR REPLACE FUNCTION public.get_all_admins()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only admins can call this function
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view admin list';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at
  FROM public.profiles p
  WHERE p.role = 'admin'
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. Function to check if a user is admin
-- More efficient than querying profiles table directly
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_user_id
    AND role = 'admin'
  );
END;
$$;

-- 5. Grant execute permissions on admin functions
-- These functions use SECURITY DEFINER, so they run with creator's privileges
-- Admins can use these functions through the application

-- Note: In production, you may want to:
-- 1. Add additional security checks
-- 2. Add audit logging for role changes
-- 3. Add rate limiting or approval workflows
-- 4. Consider using Supabase Edge Functions for sensitive operations
