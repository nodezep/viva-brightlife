-- Add return start date to loans and allow managers to regenerate schedules

alter table public.loans
  add column if not exists return_start_date date;

-- Backfill for existing non-individual loans
update public.loans
set return_start_date = disbursement_date + interval '1 day'
where return_start_date is null
  and loan_type <> 'binafsi'
  and repayment_frequency = 'daily';

update public.loans
set return_start_date = disbursement_date + interval '7 days'
where return_start_date is null
  and loan_type <> 'binafsi'
  and (repayment_frequency is null or repayment_frequency <> 'daily');

-- Allow managers to delete schedules so they can regenerate after changing start date
drop policy if exists "loan_schedules_delete_admin_only" on public.loan_schedules;
create policy "loan_schedules_delete_admin_manager" on public.loan_schedules
for delete using (public.is_admin_or_manager());
