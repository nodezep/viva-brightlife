-- SMS delivery callback tracking

alter table public.sms_reminders
  add column if not exists delivery_status text not null default 'queued',
  add column if not exists delivered_at timestamptz,
  add column if not exists provider_payload jsonb;

alter table public.sms_reminders
  drop constraint if exists sms_reminders_delivery_status_check;

alter table public.sms_reminders
  add constraint sms_reminders_delivery_status_check
  check (delivery_status in ('queued','sent','delivered','failed','cancelled'));

create index if not exists idx_sms_reminders_delivery_status
  on public.sms_reminders(delivery_status);

update public.sms_reminders
set delivery_status = case
  when status = 'queued' then 'queued'
  when status = 'sent' then 'sent'
  when status = 'failed' then 'failed'
  else 'cancelled'
end
where delivery_status is null;