-- Migration: Allow report photos to be deleted
--
-- report-images had no DELETE policy at all, so nobody could remove a photo through the
-- Storage API, not even the citizen who took it. Report photos can show people's faces,
-- so citizens may now delete their own and admins may delete any (the web Insights page
-- uses this to clear photos from incidents closed more than 30 days ago).
-- Storage deletes also need a SELECT policy on the object; both groups already have one.

DROP POLICY IF EXISTS "Users can delete own report images" ON storage.objects;
CREATE POLICY "Users can delete own report images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'report-images' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins can delete report images" ON storage.objects;
CREATE POLICY "Admins can delete report images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'report-images' AND
    public.get_user_role() = 'admin'
  );

-- Removing a photo shouldn't look like activity on the report. updated_at doubles as the
-- resolve time for completed incidents (web Insights), so clearing image_url alone keeps it.
CREATE OR REPLACE FUNCTION public.handle_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'image_url' - 'updated_at') = (to_jsonb(OLD) - 'image_url' - 'updated_at') THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_reports ON public.reports;
CREATE TRIGGER set_updated_at_reports
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_reports_updated_at();
