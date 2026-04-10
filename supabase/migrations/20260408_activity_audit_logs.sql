-- Activity audit logs for forensic tracing (non-blocking)

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_actor_id_idx on public.activity_logs (actor_id);
create index if not exists activity_logs_entity_idx on public.activity_logs (entity);
create index if not exists activity_logs_entity_id_idx on public.activity_logs (entity_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

alter table public.activity_logs enable row level security;

create policy "activity_logs_admin_select" on public.activity_logs
for select using (public.is_admin());

create policy "activity_logs_insert_self" on public.activity_logs
for insert with check (auth.uid() = actor_id);

create or replace function public.audit_table_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_action text;
  v_entity text;
  v_entity_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_changed jsonb;
  v_metadata jsonb;
begin
  v_actor := auth.uid();
  v_entity := tg_table_name;
  v_entity_id := coalesce((new).id, (old).id);

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_new := to_jsonb(new);
    v_metadata := jsonb_build_object('after', v_new);
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    if v_old ? 'updated_at' then
      v_old := v_old - 'updated_at';
      v_new := v_new - 'updated_at';
    end if;
    if v_old = v_new then
      return new;
    end if;
    select jsonb_agg(key)
      into v_changed
      from (
        select key
        from jsonb_each(v_old)
        where v_old -> key is distinct from v_new -> key
      ) diff;
    v_metadata := jsonb_build_object(
      'before', v_old,
      'after', v_new,
      'changed_fields', v_changed
    );
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_old := to_jsonb(old);
    v_metadata := jsonb_build_object('before', v_old);
  end if;

  begin
    insert into public.activity_logs (actor_id, action, entity, entity_id, metadata)
    values (v_actor, v_action, v_entity, v_entity_id, v_metadata);
  exception when others then
    -- Never block core operations if logging fails
    null;
  end;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_members on public.members;
create trigger trg_audit_members
after insert or update or delete on public.members
for each row execute function public.audit_table_changes();

drop trigger if exists trg_audit_groups on public.groups;
create trigger trg_audit_groups
after insert or update or delete on public.groups
for each row execute function public.audit_table_changes();

drop trigger if exists trg_audit_group_members on public.group_members;
create trigger trg_audit_group_members
after insert or update or delete on public.group_members
for each row execute function public.audit_table_changes();

drop trigger if exists trg_audit_loans on public.loans;
create trigger trg_audit_loans
after insert or update or delete on public.loans
for each row execute function public.audit_table_changes();

drop trigger if exists trg_audit_loan_schedules on public.loan_schedules;
create trigger trg_audit_loan_schedules
after insert or update or delete on public.loan_schedules
for each row execute function public.audit_table_changes();

drop trigger if exists trg_audit_repayments on public.repayments;
create trigger trg_audit_repayments
after insert or update or delete on public.repayments
for each row execute function public.audit_table_changes();

drop trigger if exists trg_audit_insurance_policies on public.insurance_policies;
create trigger trg_audit_insurance_policies
after insert or update or delete on public.insurance_policies
for each row execute function public.audit_table_changes();

drop trigger if exists trg_audit_admission_books on public.admission_books;
create trigger trg_audit_admission_books
after insert or update or delete on public.admission_books
for each row execute function public.audit_table_changes();
