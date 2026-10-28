-- Migration: Remember where each response office is
--
-- The web dashboard geocoded the office address with the public Nominatim service on
-- every page load. Nominatim's usage policy doesn't allow that kind of repeated use,
-- and free-form addresses often fail. The dashboard now looks the office up once and
-- saves the result here; editing the address in Settings clears it so it's looked up again.
-- Responders already update their own row ("Users can update own responder profile"), and
-- guard_responder_approval only protects account_status.

ALTER TABLE public.responder_profiles
  ADD COLUMN IF NOT EXISTS office_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS office_longitude DOUBLE PRECISION;

COMMENT ON COLUMN public.responder_profiles.office_latitude IS 'Geocoded office location, cached by the web dashboard';
COMMENT ON COLUMN public.responder_profiles.office_longitude IS 'Geocoded office location, cached by the web dashboard';
