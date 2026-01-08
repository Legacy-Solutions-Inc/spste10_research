-- Storage Policies for report-images bucket
-- 
-- PREREQUISITES:
-- 1. Run the main alerts/reports migration first
-- 2. Create the "report-images" bucket in Supabase Dashboard > Storage
-- 3. Set bucket to PRIVATE (not public)
-- 4. Then run this migration
--
-- Note: For image uploads, use the following path pattern:
--   report-images/{user_id}/{report_id}/{filename}
-- This allows proper RLS checking based on user_id in the path.

-- Users can upload their own report images
CREATE POLICY "Users can upload own report images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'report-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own report images
CREATE POLICY "Users can read own report images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Responders can read images for reports assigned to them
CREATE POLICY "Responders can read assigned report images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-images' AND
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.responder_assignments ra ON r.id = ra.report_id
      WHERE ra.responder_id = auth.uid()
      AND r.image_url LIKE '%' || storage.objects.name
    )
  );

-- Admins can read all report images
CREATE POLICY "Admins can read all report images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-images' AND
    public.get_user_role() = 'admin'
  );

