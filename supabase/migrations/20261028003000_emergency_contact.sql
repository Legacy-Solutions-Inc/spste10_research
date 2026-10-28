-- Migration: Store a contact number so responders can call the person back
--
-- Sign-up used to collect a contact number and then discard it, and nothing on an
-- alert told a responder how to reach the citizen. contact_number lives with the
-- rest of the emergency info in user_profiles (existing own-row policies apply).
-- alerts.victim_contact joins the existing victim_* columns, which the mobile app
-- now fills with a snapshot of the citizen's emergency info when an alert is sent,
-- so the record keeps what responders saw even if the profile changes later.

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS victim_contact TEXT;
