-- Migration: Allow responders to see images for pending reports
-- This allows responders to view report images when browsing pending reports in the dashboard
-- even before they accept the assignment

-- Add policy for responders to read images for pending reports
CREATE POLICY "Responders can read pending report images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-images' AND
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.status = 'pending'
      AND r.image_url LIKE '%' || storage.objects.name
    )
  );
