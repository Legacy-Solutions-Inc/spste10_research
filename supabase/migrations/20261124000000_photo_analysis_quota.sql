-- Migration: Limit photo descriptions to signed-in citizens, with a per-person and daily quota
--
-- The web app's /api/analyze-photo sends Report photos to OpenAI on the project's account,
-- and anyone who found it could call it without limit. The endpoint now calls
-- claim_photo_analysis() with the citizen's own access token before each AI call:
-- - PostgREST rejects a forged or expired token before the function runs, and auth.uid()
--   names the caller, so one round trip checks both sign-in and quota, with no
--   service-role key or external rate-limit store.
-- - photo_analysis_requests records who asked and when. The API can't read or write it:
--   RLS is on with no policies and the API roles have no privileges. The function removes
--   rows older than a day as it goes, so no scheduled cleanup is needed.
-- - The function is SECURITY DEFINER because the daily ceiling counts every user's rows.
--   Signed-in users can call it, as with get_incident_claims(); it can only use up the
--   caller's own quota, and it records a request only when it returns 'ok'.

CREATE TABLE public.photo_analysis_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-person and overall counts over a time window
CREATE INDEX photo_analysis_requests_user_id_created_at_idx
  ON public.photo_analysis_requests (user_id, created_at);
CREATE INDEX photo_analysis_requests_created_at_idx
  ON public.photo_analysis_requests (created_at);

ALTER TABLE public.photo_analysis_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.photo_analysis_requests FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.photo_analysis_requests_id_seq FROM anon, authenticated;

-- Returns 'ok', 'unauthenticated', 'user_limit' or 'daily_limit'
CREATE OR REPLACE FUNCTION public.claim_photo_analysis()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- The limits. To change them, replace this function in a new migration.
  c_requests_per_user_per_hour CONSTANT INTEGER := 10;
  c_requests_per_day CONSTANT INTEGER := 300;  -- across all users: the budget ceiling

  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 'unauthenticated';
  END IF;

  -- One claim at a time per user, so parallel requests can't both slip under the limit
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0));

  DELETE FROM public.photo_analysis_requests
  WHERE created_at < now() - INTERVAL '1 day';

  IF (
    SELECT count(*) FROM public.photo_analysis_requests
    WHERE user_id = v_user_id AND created_at >= now() - INTERVAL '1 hour'
  ) >= c_requests_per_user_per_hour THEN
    RETURN 'user_limit';
  END IF;

  IF (
    SELECT count(*) FROM public.photo_analysis_requests
    WHERE created_at >= now() - INTERVAL '1 day'
  ) >= c_requests_per_day THEN
    RETURN 'daily_limit';
  END IF;

  INSERT INTO public.photo_analysis_requests (user_id) VALUES (v_user_id);
  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_photo_analysis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_photo_analysis() TO authenticated, service_role;
