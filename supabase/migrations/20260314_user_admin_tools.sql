-- Admin user tools: soft disable + audit log

alter table public.profiles
add column if not exists is_active boolean not null default true;

create table if not exists public.user_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_audit_logs enable row level security;

create policy "user_audit_logs_admin_select" on public.user_audit_logs
for select using (public.is_admin());

create policy "user_audit_logs_admin_insert" on public.user_audit_logs
for insert with check (public.is_admin());
