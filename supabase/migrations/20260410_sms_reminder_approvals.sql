-- Add approval step and weekly throttle support for SMS reminders

do $$ begin
  alter type public.sms_status add value if not exists 'pending_approval';
exception
  when duplicate_object then null;
end $$;

alter table public.sms_reminders
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz;

create index if not exists idx_sms_reminders_status_pending
  on public.sms_reminders(status)
  where status = 'pending_approval';
