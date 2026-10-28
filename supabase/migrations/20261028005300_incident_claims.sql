-- Migration: Let response offices see who took an incident
--
-- When one office accepted an incident it simply vanished from every other office's
-- queue, because responders can only read pending incidents and their own assignments.
-- get_incident_claims() tells a responder, for incidents they were already shown, whether
-- each is still waiting and which office accepted it. It returns only the status, the
-- accepting office's name and the time, never citizen details, and only to approved
-- responders and admins (get_user_role() reports unapproved responders as 'user').

CREATE OR REPLACE FUNCTION public.get_incident_claims(p_ids UUID[])
RETURNS TABLE (
  incident_id UUID,
  status public.incident_status,
  accepted_by TEXT,
  accepted_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH incidents AS (
    SELECT a.id, a.status FROM public.alerts a WHERE a.id = ANY (p_ids[1:100])
    UNION ALL
    SELECT r.id, r.status FROM public.reports r WHERE r.id = ANY (p_ids[1:100])
  )
  SELECT i.id, i.status, p.full_name, claim.responded_at
  FROM incidents i
  LEFT JOIN LATERAL (
    SELECT ra.responder_id, ra.responded_at
    FROM public.responder_assignments ra
    WHERE (ra.alert_id = i.id OR ra.report_id = i.id)
      AND ra.response_status IN ('accepted', 'in_progress', 'completed')
    ORDER BY ra.responded_at NULLS LAST
    LIMIT 1
  ) claim ON TRUE
  LEFT JOIN public.profiles p ON p.id = claim.responder_id
  WHERE COALESCE(public.get_user_role()::TEXT, '') IN ('responder', 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.get_incident_claims(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_incident_claims(UUID[]) TO authenticated, service_role;
