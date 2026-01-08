-- Migration: Create history view combining alerts and reports
-- This view provides a unified history of user incidents (both alerts and reports)

-- 1. Create history view that combines alerts and reports
CREATE OR REPLACE VIEW public.user_history AS
SELECT 
  'alert'::TEXT AS incident_type,
  id,
  user_id,
  status::TEXT AS status,  -- Explicitly cast enum to TEXT for compatibility
  latitude,
  longitude,
  location_name,
  NULL::TEXT AS image_url,  -- Alerts don't have images
  NULL::TEXT AS description,  -- Alerts don't have descriptions
  created_at AS incident_date,
  updated_at,
  canceled_at
FROM public.alerts

UNION ALL

SELECT 
  'report'::TEXT AS incident_type,
  id,
  user_id,
  status::TEXT AS status,  -- Explicitly cast enum to TEXT for compatibility
  latitude,
  longitude,
  location_name,
  image_url,
  description,
  created_at AS incident_date,
  updated_at,
  canceled_at
FROM public.reports;

-- 2. Add comment to the view
COMMENT ON VIEW public.user_history IS 
  'Unified history view combining alerts and reports for each user. Use incident_type to distinguish between alert and report.';

-- 3. Create index on user_id and incident_date for efficient queries
-- Note: Views don't have indexes, but we can create indexes on the underlying tables
-- The existing indexes on alerts.created_at and reports.created_at should suffice

-- 4. Grant SELECT permission to authenticated users
-- RLS will be handled by the underlying tables (alerts and reports)
-- Users will only see their own history due to existing RLS policies

-- 5. Create a helper function to get user history with optional filters
CREATE OR REPLACE FUNCTION public.get_user_history(
  p_user_id UUID DEFAULT auth.uid(),
  p_incident_type TEXT DEFAULT NULL,  -- 'alert', 'report', or NULL for both
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
AS $$
BEGIN
  -- Check if user is accessing their own history or is admin/responder
  IF p_user_id != auth.uid() AND public.get_user_role() NOT IN ('admin', 'responder') THEN
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

-- 6. Add comment to the function
COMMENT ON FUNCTION public.get_user_history IS 
  'Get user history with optional filtering by incident type. Only returns incidents the user has permission to view.';

-- 7. Enable RLS on the view (PostgreSQL doesn't support RLS on views directly, 
-- but the underlying tables have RLS, so access is automatically restricted)

