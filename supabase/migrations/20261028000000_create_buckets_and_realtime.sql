-- Migration: Create storage buckets and enable realtime
-- Previously these were manual dashboard steps (see the PREREQUISITES notes in the
-- storage policy migrations). Capturing them here so a fresh project is complete
-- after running migrations alone.

-- 1. Storage buckets
-- avatars is public because the mobile app stores getPublicUrl() links in profiles.avatar_url
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- report-images stays private; apps read it via createSignedUrl()
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Realtime for tables the web dashboard subscribes to
-- (useFetchIncidents: alerts, reports; useFetchHistory: responder_assignments)
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responder_assignments;
