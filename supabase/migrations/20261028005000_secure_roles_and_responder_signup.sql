-- Migration: Lock down roles and approvals, and file responder sign-ups in the database
--
-- 1. "Users can update own profile" / "Users can insert own profile" put no limit on the
--    role column, so any signed-in user could make themselves an admin through the API.
--    "Users can update own responder profile" / "Users can insert own responder profile"
--    likewise let a responder approve themselves. RLS can't compare old and new values,
--    so guard triggers now reject those changes unless an admin makes them. Privileged
--    server code (SECURITY DEFINER functions, the SQL editor, service role) isn't affected.
-- 2. Responder data access only checked the role, never the approval, so a pending or
--    revoked office could still read citizens' alerts, reports and photos through the API.
--    get_user_role() now reports an unapproved responder as 'user', which every
--    responder policy already excludes. Revoking an office takes effect immediately.
-- 3. Web registration wrote the responder role and access request from the browser after
--    signUp. With email confirmation on there is no session yet, so RLS rejected both
--    writes and the office silently became a mobile-only account. handle_new_user() now
--    files the request from the sign-up metadata. Metadata is user-editable, but it can
--    only ever produce a responder whose request is 'pending', which (per 2) grants nothing
--    until an admin approves it.

-- 1a. Role changes are admin-only
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- current_user is 'authenticated'/'anon' only for direct API calls; SECURITY DEFINER
  -- functions such as handle_new_user() and promote_to_admin() run as their owner.
  IF current_user IN ('authenticated', 'anon')
     AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'user' THEN
      RAISE EXCEPTION 'Only administrators can assign roles';
    ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only administrators can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_role ON public.profiles;
CREATE TRIGGER guard_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role();

-- 1b. Approval decisions are admin-only; self-filed requests always start pending
CREATE OR REPLACE FUNCTION public.guard_responder_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.account_status := 'pending';
    ELSIF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Only administrators can approve or reject responder accounts';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_responder_approval ON public.responder_profiles;
CREATE TRIGGER guard_responder_approval
  BEFORE INSERT OR UPDATE ON public.responder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_responder_approval();

-- 2. Only approved responders count as responders in RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_role = 'responder' AND NOT EXISTS (
    SELECT 1 FROM public.responder_profiles rp
    WHERE rp.id = auth.uid() AND rp.account_status = 'approved'
  ) THEN
    RETURN 'user';
  END IF;

  RETURN v_role;
END;
$$;

-- 3. File responder access requests at sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_responder BOOLEAN := (v_meta->>'requested_role') = 'responder';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(btrim(v_meta->>'full_name'), ''),
    CASE WHEN v_responder THEN 'responder' ELSE 'user' END::public.user_role
  );

  IF v_responder THEN
    INSERT INTO public.responder_profiles (id, municipality, province, office_address, contact_number, account_status)
    VALUES (
      NEW.id,
      NULLIF(btrim(v_meta->>'municipality'), ''),
      NULLIF(btrim(v_meta->>'province'), ''),
      NULLIF(btrim(v_meta->>'office_address'), ''),
      NULLIF(btrim(v_meta->>'contact_number'), ''),
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;
