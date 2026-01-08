-- Fix Avatars Storage Policies
-- This migration fixes the RLS policies for avatars bucket to properly check file paths
-- 
-- PREREQUISITES:
-- 1. The avatars bucket must already exist
-- 2. Previous avatars storage policies migration should have been run
-- 
-- This will drop and recreate the policies with corrected path checking

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all avatars" ON storage.objects;

-- Users can upload their own avatars
-- Path pattern: avatars/{user_id}/{filename}
-- Using split_part to extract user_id from path (second part after splitting by '/')
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    split_part(name, '/', 2) = auth.uid()::text
  );

-- Users can update their own avatars
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    split_part(name, '/', 2) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    split_part(name, '/', 2) = auth.uid()::text
  );

-- Users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    split_part(name, '/', 2) = auth.uid()::text
  );

-- Users can read their own avatars
CREATE POLICY "Users can read own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    split_part(name, '/', 2) = auth.uid()::text
  );

-- All authenticated users can read avatars (for viewing profiles)
-- If you want avatars to be private, remove this policy
CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
  );

-- Admins can manage all avatars
CREATE POLICY "Admins can manage all avatars"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    public.get_user_role() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    public.get_user_role() = 'admin'
  );

