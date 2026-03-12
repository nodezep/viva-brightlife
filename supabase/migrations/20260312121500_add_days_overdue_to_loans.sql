alter table public.loans
add column if not exists days_overdue integer not null default 0;
