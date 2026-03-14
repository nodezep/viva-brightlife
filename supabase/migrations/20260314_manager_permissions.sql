-- Manager permissions and safeguards for sensitive updates

-- Helper role checks
create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'manager'
  );
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  );
$$;

-- New users should not default to admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Members
create policy "members_select_admin_manager" on public.members
for select using (public.is_admin_or_manager());

create policy "members_insert_admin_manager" on public.members
for insert with check (public.is_admin_or_manager());

create policy "members_update_admin_manager" on public.members
for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "members_delete_admin_only" on public.members
for delete using (public.is_admin());

-- Groups
create policy "groups_select_admin_manager" on public.groups
for select using (public.is_admin_or_manager());

create policy "groups_insert_admin_manager" on public.groups
for insert with check (public.is_admin_or_manager());

create policy "groups_update_admin_manager" on public.groups
for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "groups_delete_admin_only" on public.groups
for delete using (public.is_admin());

-- Group members
create policy "group_members_select_admin_manager" on public.group_members
for select using (public.is_admin_or_manager());

create policy "group_members_insert_admin_manager" on public.group_members
for insert with check (public.is_admin_or_manager());

create policy "group_members_update_admin_manager" on public.group_members
for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "group_members_delete_admin_only" on public.group_members
for delete using (public.is_admin());

-- Loans
create policy "loans_select_admin_manager" on public.loans
for select using (public.is_admin_or_manager());

create policy "loans_insert_admin_manager" on public.loans
for insert with check (public.is_admin_or_manager());

create policy "loans_update_admin_manager" on public.loans
for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "loans_delete_admin_only" on public.loans
for delete using (public.is_admin());

-- Loan schedules (repayment tracking)
create policy "loan_schedules_select_admin_manager" on public.loan_schedules
for select using (public.is_admin_or_manager());

create policy "loan_schedules_insert_admin_manager" on public.loan_schedules
for insert with check (public.is_admin_or_manager());

create policy "loan_schedules_update_admin_manager" on public.loan_schedules
for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "loan_schedules_delete_admin_only" on public.loan_schedules
for delete using (public.is_admin());

-- Admission books
create policy "admission_books_select_admin_manager" on public.admission_books
for select using (public.is_admin_or_manager());

create policy "admission_books_insert_admin_manager" on public.admission_books
for insert with check (public.is_admin_or_manager());

create policy "admission_books_update_admin_manager" on public.admission_books
for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "admission_books_delete_admin_only" on public.admission_books
for delete using (public.is_admin());

-- Repayments
create policy "repayments_select_admin_manager" on public.repayments
for select using (public.is_admin_or_manager());

create policy "repayments_insert_admin_manager" on public.repayments
for insert with check (public.is_admin_or_manager());

create policy "repayments_update_admin_only" on public.repayments
for update using (public.is_admin());

create policy "repayments_delete_admin_only" on public.repayments
for delete using (public.is_admin());

-- Insurance policies (view allowed for managers, edits admin only)
create policy "insurance_select_admin_manager" on public.insurance_policies
for select using (public.is_admin_or_manager());

create policy "insurance_insert_admin_only" on public.insurance_policies
for insert with check (public.is_admin());

create policy "insurance_update_admin_only" on public.insurance_policies
for update using (public.is_admin());

create policy "insurance_delete_admin_only" on public.insurance_policies
for delete using (public.is_admin());

-- Guardrails: prevent managers from editing sensitive loan fields
create or replace function public.block_manager_loan_edits()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if public.is_manager() then
    -- Allow only operational fields (status + balances updated via schedule)
    if new.loan_number is distinct from old.loan_number
      or new.member_id is distinct from old.member_id
      or new.group_id is distinct from old.group_id
      or new.loan_type is distinct from old.loan_type
      or new.principal_amount is distinct from old.principal_amount
      or new.disbursement_date is distinct from old.disbursement_date
      or new.security_amount is distinct from old.security_amount
      or new.cycle_count is distinct from old.cycle_count
      or new.weekly_installment is distinct from old.weekly_installment
      or new.monthly_installment is distinct from old.monthly_installment
      or new.amount_withdrawn is distinct from old.amount_withdrawn
      or new.overdue_amount is distinct from old.overdue_amount
      or new.interest_rate is distinct from old.interest_rate
      or new.duration_months is distinct from old.duration_months
      or new.item_description is distinct from old.item_description
    then
      raise exception 'Managers cannot edit sensitive loan fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_loans_block_manager_edits on public.loans;
create trigger trg_loans_block_manager_edits
before update on public.loans
for each row execute function public.block_manager_loan_edits();

-- Guardrails: prevent managers from editing schedule structure
create or replace function public.block_manager_schedule_edits()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if public.is_manager() then
    if new.loan_id is distinct from old.loan_id
      or new.week_number is distinct from old.week_number
      or new.expected_date is distinct from old.expected_date
      or new.expected_amount is distinct from old.expected_amount
    then
      raise exception 'Managers cannot edit schedule dates or amounts';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_schedule_block_manager_edits on public.loan_schedules;
create trigger trg_schedule_block_manager_edits
before update on public.loan_schedules
for each row execute function public.block_manager_schedule_edits();
