create type public.schedule_status as enum ('pending', 'paid', 'partial', 'overdue');

create table if not exists public.loan_schedules (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  week_number integer not null,
  expected_date date not null,
  expected_amount numeric(14,2) not null,
  paid_amount numeric(14,2) not null default 0,
  status public.schedule_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for updated_at
create trigger trg_loan_schedules_updated_at
before update on public.loan_schedules
for each row execute function public.set_updated_at();

alter table public.loan_schedules enable row level security;
create policy "loan_schedules_admin_all" on public.loan_schedules
for all using (public.is_admin()) with check (public.is_admin());
