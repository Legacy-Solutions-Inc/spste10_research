-- Migration: Improve settings schema consistency and performance
-- This migration standardizes the updated_at trigger function and adds performance indexes
-- for the settings functionality (profiles and responder_profiles tables)

-- 1. Standardize updated_at trigger function for responder_profiles
-- Replace the custom handle_responder_profiles_updated_at() with the generic handle_updated_at()
-- This improves maintainability and consistency across all tables

-- Drop the old trigger first
DROP TRIGGER IF EXISTS set_responder_profiles_updated_at ON public.responder_profiles;

-- Update the trigger to use the generic handle_updated_at() function
CREATE TRIGGER set_responder_profiles_updated_at
  BEFORE UPDATE ON public.responder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Drop the old function (no longer needed)
DROP FUNCTION IF EXISTS public.handle_responder_profiles_updated_at();

-- 2. Add performance index on province column
-- This improves query performance when filtering/searching by province
CREATE INDEX IF NOT EXISTS idx_responder_profiles_province ON public.responder_profiles(province);

-- Note: The generic handle_updated_at() function already exists from the create_rbac_profiles migration
-- and is used by both profiles and user_profiles tables, so responder_profiles now uses the same function
