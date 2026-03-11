-- SMS reminder infrastructure

create type public.sms_status as enum ('queued', 'sent', 'failed', 'cancelled');

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  sms_enabled boolean not null default true,
  preferred_language text not null default 'sw',
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sms_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  language text not null default 'sw',
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, language)
);

create table if not exists public.sms_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  days_overdue integer not null,
  is_active boolean not null default true,
  send_hour_local integer not null default 9,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (days_overdue >= 1),
  check (send_hour_local between 0 and 23)
);

create table if not exists public.sms_reminders (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  reminder_key text not null,
  phone text not null,
  message text not null,
  days_overdue integer not null,
  scheduled_for timestamptz not null,
  status public.sms_status not null default 'queued',
  provider_name text,
  provider_message_id text,
  sent_at timestamptz,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_id, reminder_key)
);

create index if not exists idx_sms_reminders_status_schedule
  on public.sms_reminders(status, scheduled_for);

create index if not exists idx_sms_reminders_member
  on public.sms_reminders(member_id);

-- updated_at triggers
create or replace function public.set_updated_at_generic()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at_generic();

drop trigger if exists trg_sms_templates_updated_at on public.sms_templates;
create trigger trg_sms_templates_updated_at
before update on public.sms_templates
for each row execute function public.set_updated_at_generic();

drop trigger if exists trg_sms_reminder_rules_updated_at on public.sms_reminder_rules;
create trigger trg_sms_reminder_rules_updated_at
before update on public.sms_reminder_rules
for each row execute function public.set_updated_at_generic();

drop trigger if exists trg_sms_reminders_updated_at on public.sms_reminders;
create trigger trg_sms_reminders_updated_at
before update on public.sms_reminders
for each row execute function public.set_updated_at_generic();

-- Seed baseline reminder rules (idempotent)
insert into public.sms_reminder_rules (rule_key, days_overdue, send_hour_local)
values
  ('overdue_day_1', 1, 9),
  ('overdue_day_3', 3, 9),
  ('overdue_day_7', 7, 9)
on conflict (rule_key) do update
set days_overdue = excluded.days_overdue,
    send_hour_local = excluded.send_hour_local,
    is_active = true;

-- Seed baseline templates
insert into public.sms_templates (template_key, language, body)
values
  (
    'repayment_overdue',
    'sw',
    'Ndugu {{member_name}}, kumbusho: mkopo {{loan_number}} una deni la TZS {{overdue_amount}} umechelewa kwa siku {{days_overdue}}. Tafadhali lipa haraka. Viva Brightlife.'
  ),
  (
    'repayment_overdue',
    'en',
    'Dear {{member_name}}, reminder: loan {{loan_number}} has overdue TZS {{overdue_amount}} for {{days_overdue}} day(s). Please repay as soon as possible. Viva Brightlife.'
  )
on conflict (template_key, language) do update
set body = excluded.body,
    is_active = true;

-- RLS
alter table public.notification_preferences enable row level security;
alter table public.sms_templates enable row level security;
alter table public.sms_reminder_rules enable row level security;
alter table public.sms_reminders enable row level security;

create policy "notification_preferences_admin_all" on public.notification_preferences
for all using (public.is_admin()) with check (public.is_admin());

create policy "sms_templates_admin_all" on public.sms_templates
for all using (public.is_admin()) with check (public.is_admin());

create policy "sms_reminder_rules_admin_all" on public.sms_reminder_rules
for all using (public.is_admin()) with check (public.is_admin());

create policy "sms_reminders_admin_all" on public.sms_reminders
for all using (public.is_admin()) with check (public.is_admin());