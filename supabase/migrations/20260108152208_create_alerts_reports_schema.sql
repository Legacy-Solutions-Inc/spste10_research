-- Supabase Alerts and Reports Schema Migration
-- Creates tables for emergency alerts, reports, and responder assignments

-- 1. Create enum types for status tracking
CREATE TYPE incident_status AS ENUM ('pending', 'accepted', 'rejected', 'canceled', 'completed');
CREATE TYPE response_status AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed');

-- 2. Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status incident_status NOT NULL DEFAULT 'pending',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  victim_name TEXT,
  victim_age INTEGER,
  victim_blood_type TEXT,
  victim_sex TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  canceled_at TIMESTAMPTZ
);

-- 3. Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status incident_status NOT NULL DEFAULT 'pending',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  canceled_at TIMESTAMPTZ
);

-- 4. Create responder_assignments junction table
CREATE TABLE public.responder_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  responder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  response_status response_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  CONSTRAINT check_alert_or_report CHECK (alert_id IS NOT NULL OR report_id IS NOT NULL)
);

-- Unique constraints using partial indexes (to handle nullable columns properly)
CREATE UNIQUE INDEX unique_alert_assignment ON public.responder_assignments(responder_id, alert_id) WHERE alert_id IS NOT NULL;
CREATE UNIQUE INDEX unique_report_assignment ON public.responder_assignments(responder_id, report_id) WHERE report_id IS NOT NULL;

-- 5. Create indexes for alerts table
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX idx_alerts_location ON public.alerts(latitude, longitude);

-- 6. Create indexes for reports table
CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_reports_location ON public.reports(latitude, longitude);

-- 7. Create indexes for responder_assignments table
CREATE INDEX idx_responder_assignments_alert_id ON public.responder_assignments(alert_id) WHERE alert_id IS NOT NULL;
CREATE INDEX idx_responder_assignments_report_id ON public.responder_assignments(report_id) WHERE report_id IS NOT NULL;
CREATE INDEX idx_responder_assignments_responder_id ON public.responder_assignments(responder_id);
CREATE INDEX idx_responder_assignments_status ON public.responder_assignments(response_status);

-- 8. Enable Row-Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responder_assignments ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for alerts table

-- Users can read their own alerts
CREATE POLICY "Users can read own alerts"
  ON public.alerts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own alerts (must be role 'user')
CREATE POLICY "Users can insert own alerts"
  ON public.alerts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    public.get_user_role() = 'user'
  );

-- Users can update their own alerts (only to cancel when pending)
CREATE POLICY "Users can update own alerts"
  ON public.alerts
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'canceled'
  );

-- Responders can read alerts assigned to them
CREATE POLICY "Responders can read assigned alerts"
  ON public.alerts
  FOR SELECT
  USING (
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.responder_assignments
      WHERE alert_id = alerts.id
      AND responder_id = auth.uid()
    )
  );

-- Responders can see all pending alerts (for assignment selection)
CREATE POLICY "Responders can see pending alerts"
  ON public.alerts
  FOR SELECT
  USING (
    public.get_user_role() = 'responder' AND
    status = 'pending'
  );

-- Responders can update alerts assigned to them (status changes)
CREATE POLICY "Responders can update assigned alerts"
  ON public.alerts
  FOR UPDATE
  USING (
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.responder_assignments
      WHERE alert_id = alerts.id
      AND responder_id = auth.uid()
      AND response_status = 'accepted'
    )
  )
  WITH CHECK (
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.responder_assignments
      WHERE alert_id = alerts.id
      AND responder_id = auth.uid()
    )
  );

-- Admins can read all alerts
CREATE POLICY "Admins can read all alerts"
  ON public.alerts
  FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Admins can update any alerts
CREATE POLICY "Admins can update any alerts"
  ON public.alerts
  FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Admins can delete any alerts
CREATE POLICY "Admins can delete any alerts"
  ON public.alerts
  FOR DELETE
  USING (public.get_user_role() = 'admin');

-- 10. RLS Policies for reports table

-- Users can read their own reports
CREATE POLICY "Users can read own reports"
  ON public.reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reports (must be role 'user')
CREATE POLICY "Users can insert own reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    public.get_user_role() = 'user'
  );

-- Users can update their own reports (only to cancel when pending)
CREATE POLICY "Users can update own reports"
  ON public.reports
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'canceled'
  );

-- Responders can read reports assigned to them
CREATE POLICY "Responders can read assigned reports"
  ON public.reports
  FOR SELECT
  USING (
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.responder_assignments
      WHERE report_id = reports.id
      AND responder_id = auth.uid()
    )
  );

-- Responders can see all pending reports (for assignment selection)
CREATE POLICY "Responders can see pending reports"
  ON public.reports
  FOR SELECT
  USING (
    public.get_user_role() = 'responder' AND
    status = 'pending'
  );

-- Responders can update reports assigned to them (status changes)
CREATE POLICY "Responders can update assigned reports"
  ON public.reports
  FOR UPDATE
  USING (
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.responder_assignments
      WHERE report_id = reports.id
      AND responder_id = auth.uid()
      AND response_status = 'accepted'
    )
  )
  WITH CHECK (
    public.get_user_role() = 'responder' AND
    EXISTS (
      SELECT 1 FROM public.responder_assignments
      WHERE report_id = reports.id
      AND responder_id = auth.uid()
    )
  );

-- Admins can read all reports
CREATE POLICY "Admins can read all reports"
  ON public.reports
  FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Admins can update any reports
CREATE POLICY "Admins can update any reports"
  ON public.reports
  FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Admins can delete any reports
CREATE POLICY "Admins can delete any reports"
  ON public.reports
  FOR DELETE
  USING (public.get_user_role() = 'admin');

-- 11. RLS Policies for responder_assignments table

-- Responders can read their own assignments
CREATE POLICY "Responders can read own assignments"
  ON public.responder_assignments
  FOR SELECT
  USING (
    responder_id = auth.uid() OR
    public.get_user_role() = 'admin'
  );

-- Responders can create their own assignments (self-assign to pending alerts/reports)
CREATE POLICY "Responders can create own assignments"
  ON public.responder_assignments
  FOR INSERT
  WITH CHECK (
    responder_id = auth.uid() AND
    public.get_user_role() = 'responder' AND
    (
      (alert_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.alerts
        WHERE id = alert_id AND status = 'pending'
      )) OR
      (report_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.reports
        WHERE id = report_id AND status = 'pending'
      ))
    )
  );

-- Responders can update their own assignments (response_status)
CREATE POLICY "Responders can update own assignments"
  ON public.responder_assignments
  FOR UPDATE
  USING (responder_id = auth.uid())
  WITH CHECK (responder_id = auth.uid());

-- Admins can manage all assignments
CREATE POLICY "Admins can manage assignments"
  ON public.responder_assignments
  FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- 12. Create trigger function for updated_at (reuse existing if available, or create new)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 13. Create trigger function to update alert/report status when responder accepts
CREATE OR REPLACE FUNCTION public.handle_responder_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a responder accepts an assignment, update the incident status to 'accepted'
  IF NEW.response_status = 'accepted' THEN
    -- Update alert status if this is an alert assignment
    IF NEW.alert_id IS NOT NULL THEN
      UPDATE public.alerts
      SET status = 'accepted'
      WHERE id = NEW.alert_id
        AND status = 'pending';
    END IF;
    
    -- Update report status if this is a report assignment
    IF NEW.report_id IS NOT NULL THEN
      UPDATE public.reports
      SET status = 'accepted'
      WHERE id = NEW.report_id
        AND status = 'pending';
    END IF;
    
    -- Set responded_at timestamp
    NEW.responded_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 14. Create triggers for auto-updating updated_at
CREATE TRIGGER set_updated_at_alerts
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_reports
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 15. Create trigger to update incident status when responder accepts
CREATE TRIGGER on_responder_accepts
  BEFORE INSERT OR UPDATE ON public.responder_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_responder_acceptance();