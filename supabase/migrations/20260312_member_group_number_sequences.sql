-- Auto-generate numeric member and group numbers when not provided.
-- Keep as text for flexibility, but use numeric sequences by default.

create sequence if not exists public.members_member_number_seq;
create sequence if not exists public.groups_group_number_seq;

select setval(
  'public.members_member_number_seq',
  coalesce(
    (select max(member_number::bigint) from public.members where member_number ~ '^\d+$'),
    0
  ) + 1,
  false
);

select setval(
  'public.groups_group_number_seq',
  coalesce(
    (select max(group_number::bigint) from public.groups where group_number ~ '^\d+$'),
    0
  ) + 1,
  false
);

alter table public.members
  alter column member_number set default nextval('public.members_member_number_seq')::text;

alter table public.groups
  alter column group_number set default nextval('public.groups_group_number_seq')::text;
