-- Drop the unique constraint on member_number
alter table public.members
  drop constraint if exists members_member_number_key;
