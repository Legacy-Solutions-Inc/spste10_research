-- Storage Policies for avatars bucket
-- 
-- PREREQUISITES:
-- 1. Run the profiles migration first (20260108140708_create_rbac_profiles.sql)
-- 2. Create the "avatars" bucket in Supabase Dashboard > Storage
-- 3. Set bucket to PRIVATE (not public) - or PUBLIC if you want avatars to be publicly accessible
-- 4. Then run this migration
--
-- Note: For avatar uploads, use the following path pattern:
--   avatars/{user_id}/{filename}
-- This allows proper RLS checking based on user_id in the path.

-- Users can upload their own avatars
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/delete their own avatars
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own avatars
CREATE POLICY "Users can read own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- All authenticated users can read avatars (for viewing profiles)
-- If you want avatars to be private, remove this policy
CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
  );

-- Alternative: If you want more restricted access, use this instead:
-- Only allow reading avatars for users whose profiles can be viewed
-- (This is more secure but requires profile-based access logic)
-- CREATE POLICY "Users can read avatars for viewable profiles"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'avatars' AND
--     (
--       -- Can read own avatar
--       auth.uid()::text = (storage.foldername(name))[1] OR
--       -- Responders can read avatars (for viewing user profiles on alerts/reports)
--       public.get_user_role() = 'responder' OR
--       -- Admins can read all avatars
--       public.get_user_role() = 'admin'
--     )
--   );

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

