-- Fix RLS Update Policies for Reports and Alerts
-- This migration allows users to update fields (like image_url) on their pending reports/alerts
-- while still restricting status changes to only allow canceling.

-- 1. Fix Reports Table Policies

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;

-- Create policy for updating fields (keeping status as pending)
CREATE POLICY "Users can update own pending reports"
  ON public.reports
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending'  -- Status must remain pending for field updates
  );

-- Create policy for canceling reports
CREATE POLICY "Users can cancel own reports"
  ON public.reports
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'canceled'  -- Status must change to canceled
  );

-- 2. Fix Alerts Table Policies (for consistency)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;

-- Create policy for updating fields (keeping status as pending)
CREATE POLICY "Users can update own pending alerts"
  ON public.alerts
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending'  -- Status must remain pending for field updates
  );

-- Create policy for canceling alerts
CREATE POLICY "Users can cancel own alerts"
  ON public.alerts
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'canceled'  -- Status must change to canceled
  );

