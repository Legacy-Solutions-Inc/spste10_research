-- Migration: Let citizens close their own incidents and see who is handling them
--
-- 1. Users could only cancel while an alert/report was 'pending'. After a responder
--    accepted, the mobile "Cancel" updated zero rows without an error, so the app
--    reported success while the incident stayed 'accepted'. Nothing could mark an
--    incident 'completed' either. close_my_incident() makes every allowed transition
--    explicit and raises on anything else, so the app can never fail silently:
--      pending  -> canceled
--      accepted -> completed ("Help has arrived") | canceled ("I no longer need help")
--    A function is used instead of another UPDATE policy because permissive policies
--    are OR'd together, which would also allow e.g. accepted -> pending.
-- 2. close_reason records why a citizen canceled (for the research data).
-- 3. Citizens could not read responder_assignments at all, so the mobile app could
--    never tell that a responder had declined. They may now read (not write)
--    assignments on their own alerts/reports, which also lets Realtime deliver them.

-- 1. Reason a citizen gave when canceling
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS close_reason TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS close_reason TEXT;

-- 2. Close-out with explicit transitions
CREATE OR REPLACE FUNCTION public.close_my_incident(
  p_kind TEXT,
  p_id UUID,
  p_outcome public.incident_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.incident_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current public.incident_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('completed', 'canceled') THEN
    RAISE EXCEPTION 'Invalid outcome: %', p_outcome;
  END IF;

  IF p_kind = 'alert' THEN
    SELECT status INTO v_current
    FROM public.alerts
    WHERE id = p_id AND user_id = auth.uid()
    FOR UPDATE;
  ELSIF p_kind = 'report' THEN
    SELECT status INTO v_current
    FROM public.reports
    WHERE id = p_id AND user_id = auth.uid()
    FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Invalid incident kind: %', p_kind;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  -- Already in the requested state (e.g. a responder resolved it at the same moment)
  IF v_current = p_outcome THEN
    RETURN v_current;
  END IF;

  IF NOT (
    (v_current = 'pending' AND p_outcome = 'canceled') OR
    (v_current = 'accepted' AND p_outcome IN ('completed', 'canceled'))
  ) THEN
    RAISE EXCEPTION 'This incident is already %', v_current;
  END IF;

  IF p_kind = 'alert' THEN
    UPDATE public.alerts
    SET status = p_outcome,
        canceled_at = CASE WHEN p_outcome = 'canceled' THEN NOW() ELSE canceled_at END,
        close_reason = p_reason
    WHERE id = p_id;
  ELSE
    UPDATE public.reports
    SET status = p_outcome,
        canceled_at = CASE WHEN p_outcome = 'canceled' THEN NOW() ELSE canceled_at END,
        close_reason = p_reason
    WHERE id = p_id;
  END IF;

  RETURN p_outcome;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_my_incident(TEXT, UUID, public.incident_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_my_incident(TEXT, UUID, public.incident_status, TEXT) TO authenticated, service_role;

-- 3. Citizens can see assignments on their own incidents (read-only).
-- The ownership check lives in a SECURITY DEFINER helper: querying alerts/reports
-- directly from this policy would recurse, because "Responders can read assigned
-- alerts/reports" in turn query responder_assignments.
CREATE OR REPLACE FUNCTION public.is_own_incident(p_alert_id UUID, p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (p_alert_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.alerts WHERE id = p_alert_id AND user_id = auth.uid()
    )) OR
    (p_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.reports WHERE id = p_report_id AND user_id = auth.uid()
    ));
$$;

REVOKE EXECUTE ON FUNCTION public.is_own_incident(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_incident(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can read assignments on own incidents" ON public.responder_assignments;
CREATE POLICY "Users can read assignments on own incidents"
  ON public.responder_assignments
  FOR SELECT
  TO authenticated
  USING (public.is_own_incident(alert_id, report_id));
