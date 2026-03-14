-- Run this in Supabase SQL Editor
-- The schedule_status type already exists, so we just create the table

CREATE TABLE IF NOT EXISTS public.loan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  expected_date DATE NOT NULL,
  expected_amount NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.schedule_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loan_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "loan_schedules_admin_all" ON public.loan_schedules
FOR ALL TO authenticated USING (true) WITH CHECK (true);
