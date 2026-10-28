-- Migration: Close privilege escalation in admin functions and RLS bypass in user_history
--
-- 1. promote_to_admin had no caller check, so anyone (even without signing in) could
--    call /rest/v1/rpc/promote_to_admin and make any account an admin.
-- 2. demote_from_admin, get_all_admins and get_user_history compared get_user_role()
--    with != / NOT IN. For anon callers the role is NULL, the comparison is NULL, and
--    the guard is skipped. Use IS DISTINCT FROM / COALESCE so NULL counts as "not allowed".
-- 3. user_history ran with the view owner's privileges and bypassed RLS on alerts and
--    reports. security_invoker makes it respect the caller's RLS, as originally intended.

-- 1. promote_to_admin: only admins may call it from the API.
-- auth.uid() is NULL only when run outside the API (SQL editor / service role), which is
-- how the first admin is bootstrapped; anon cannot reach that path because EXECUTE is revoked below.
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can promote users to admin';
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = NOW()
  WHERE id = user_id;

  RETURN FOUND;
END;
$$;

-- 2. demote_from_admin: treat a NULL role as non-admin
CREATE OR REPLACE FUNCTION public.demote_from_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can demote other admins';
  END IF;

  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;

  UPDATE public.profiles
  SET role = 'user', updated_at = NOW()
  WHERE id = user_id;

  RETURN FOUND;
END;
$$;

-- 3. get_all_admins: treat a NULL role as non-admin
CREATE OR REPLACE FUNCTION public.get_all_admins()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can view admin list';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.created_at
  FROM public.profiles p
  WHERE p.role = 'admin'
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. get_user_history: treat a NULL caller / role as not allowed
CREATE OR REPLACE FUNCTION public.get_user_history(
  p_user_id UUID DEFAULT auth.uid(),
  p_incident_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  incident_type TEXT,
  id UUID,
  user_id UUID,
  status TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  image_url TEXT,
  description TEXT,
  incident_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(public.get_user_role()::TEXT, '') NOT IN ('admin', 'responder') THEN
    RAISE EXCEPTION 'Access denied: You can only view your own history';
  END IF;

  RETURN QUERY
  SELECT
    uh.incident_type,
    uh.id,
    uh.user_id,
    uh.status::TEXT,
    uh.latitude,
    uh.longitude,
    uh.location_name,
    uh.image_url,
    uh.description,
    uh.incident_date,
    uh.updated_at,
    uh.canceled_at
  FROM public.user_history uh
  WHERE uh.user_id = p_user_id
    AND (p_incident_type IS NULL OR uh.incident_type = p_incident_type)
  ORDER BY uh.incident_date DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 5. Signed-out callers have no business calling these
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.demote_from_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_all_admins() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_history(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demote_from_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_admins() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_history(UUID, TEXT, INTEGER, INTEGER) TO authenticated, service_role;

-- 6. user_history: enforce the caller's RLS on alerts and reports
ALTER VIEW public.user_history SET (security_invoker = true);
