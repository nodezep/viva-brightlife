-- Enable extension
create extension if not exists pgcrypto;

-- 1. profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- 2. members
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_number text not null unique,
  full_name text not null,
  phone text,
  email text,
  id_number text,
  savings_balance numeric(14,2) not null default 0,
  occupation text,
  created_at timestamptz not null default now()
);

-- 3. groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  group_number text not null unique,
  group_type text not null,
  created_at timestamptz not null default now()
);

-- 4. group_members
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  role_in_group text,
  joined_at timestamptz not null default now(),
  unique (group_id, member_id)
);

-- Loan type enum
create type public.loan_type as enum (
  'binafsi',
  'biashara',
  'watumishi',
  'electronics',
  'kilimo',
  'bima',
  'vikundi_wakinamama',
  'vyombo_moto'
);

create type public.loan_status as enum ('active', 'closed', 'defaulted', 'pending');

-- 5. loans
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  loan_number text not null unique,
  member_id uuid not null references public.members(id) on delete restrict,
  group_id uuid references public.groups(id) on delete set null,
  loan_type public.loan_type not null,
  loan_category text,
  principal_amount numeric(14,2) not null,
  disbursement_date date not null,
  security_amount numeric(14,2) not null default 0,
  cycle_count integer not null default 1,
  weekly_installment numeric(14,2) not null default 0,
  monthly_installment numeric(14,2) not null default 0,
  amount_withdrawn numeric(14,2) not null default 0,
  outstanding_balance numeric(14,2) not null default 0,
  overdue_amount numeric(14,2) not null default 0,
  interest_rate numeric(5,2) not null default 0,
  duration_months integer not null default 1,
  item_description text,
  status public.loan_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. repayments
create table if not exists public.repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  amount numeric(14,2) not null,
  payment_date date not null,
  payment_method text,
  reference_number text,
  notes text,
  created_at timestamptz not null default now()
);

-- 7. insurance_policies
create table if not exists public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  policy_number text not null unique,
  policy_type text not null,
  premium_amount numeric(14,2) not null,
  coverage_amount numeric(14,2) not null,
  start_date date not null,
  end_date date not null,
  status text not null,
  created_at timestamptz not null default now()
);

-- Trigger for updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_loans_updated_at on public.loans;
create trigger trg_loans_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.loans enable row level security;
alter table public.repayments enable row level security;
alter table public.insurance_policies enable row level security;

-- Helper role check
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Admin-only for now (future roles can extend policies)
create policy "profiles_select_self_or_admin" on public.profiles
for select using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_self" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin());

create policy "members_admin_all" on public.members
for all using (public.is_admin()) with check (public.is_admin());

create policy "groups_admin_all" on public.groups
for all using (public.is_admin()) with check (public.is_admin());

create policy "group_members_admin_all" on public.group_members
for all using (public.is_admin()) with check (public.is_admin());

create policy "loans_admin_all" on public.loans
for all using (public.is_admin()) with check (public.is_admin());

create policy "repayments_admin_all" on public.repayments
for all using (public.is_admin()) with check (public.is_admin());

create policy "insurance_admin_all" on public.insurance_policies
for all using (public.is_admin()) with check (public.is_admin());-- Auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
