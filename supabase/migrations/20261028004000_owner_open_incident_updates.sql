-- Migration: Let citizens finish attaching details to an incident after it is accepted
--
-- The mobile app sends an alert/report immediately and fills in details a few seconds
-- later: a fresh GPS fix replacing a cached one, the place name, the AI photo
-- description, and the citizen's emergency info. The existing "Users can update own
-- pending ..." policies stop those updates the moment a responder accepts, so a fast
-- acceptance could leave the responder with a stale position.
--
-- update_my_open_incident() allows exactly those fields while the incident is
-- 'pending' or 'accepted', for the owner only:
--   * position: latitude and longitude together, range-checked
--   * location_name: replaced
--   * description (reports): only set while empty, so the AI text is never overwritten
--   * victim_* (alerts): only fills fields that are still empty
-- Status and ownership cannot be changed through it.

CREATE OR REPLACE FUNCTION public.update_my_open_incident(
  p_kind TEXT,
  p_id UUID,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_location_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_victim_name TEXT DEFAULT NULL,
  p_victim_age INTEGER DEFAULT NULL,
  p_victim_sex TEXT DEFAULT NULL,
  p_victim_blood_type TEXT DEFAULT NULL,
  p_victim_contact TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
    RAISE EXCEPTION 'Latitude and longitude must be updated together';
  END IF;

  IF p_latitude IS NOT NULL AND (
    p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180
  ) THEN
    RAISE EXCEPTION 'Position out of range';
  END IF;

  IF p_kind = 'alert' THEN
    UPDATE public.alerts
    SET latitude = COALESCE(p_latitude, latitude),
        longitude = COALESCE(p_longitude, longitude),
        location_name = COALESCE(p_location_name, location_name),
        victim_name = COALESCE(victim_name, p_victim_name),
        victim_age = COALESCE(victim_age, p_victim_age),
        victim_sex = COALESCE(victim_sex, p_victim_sex),
        victim_blood_type = COALESCE(victim_blood_type, p_victim_blood_type),
        victim_contact = COALESCE(victim_contact, p_victim_contact)
    WHERE id = p_id
      AND user_id = auth.uid()
      AND status IN ('pending', 'accepted');
  ELSIF p_kind = 'report' THEN
    UPDATE public.reports
    SET latitude = COALESCE(p_latitude, latitude),
        longitude = COALESCE(p_longitude, longitude),
        location_name = COALESCE(p_location_name, location_name),
        description = COALESCE(description, p_description)
    WHERE id = p_id
      AND user_id = auth.uid()
      AND status IN ('pending', 'accepted');
  ELSE
    RAISE EXCEPTION 'Invalid incident kind: %', p_kind;
  END IF;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_my_open_incident(
  TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_open_incident(
  TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT
) TO authenticated, service_role;
