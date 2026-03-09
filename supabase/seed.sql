-- Optional seed data for testing UI flow

insert into public.members (member_number, full_name, phone, email, id_number, savings_balance, occupation)
values
  ('MBR-1001', 'Asha Juma', '+255700000001', 'asha@example.com', 'ID1001', 250000, 'Trader'),
  ('MBR-1002', 'Neema Ally', '+255700000002', 'neema@example.com', 'ID1002', 180000, 'Farmer')
on conflict (member_number) do nothing;

insert into public.groups (group_name, group_number, group_type)
values
  ('Umoja Women Group', 'GRP-1001', 'Wakina Mama')
on conflict (group_number) do nothing;

insert into public.group_members (group_id, member_id, role_in_group)
select g.id, m.id, 'Member'
from public.groups g
join public.members m on m.member_number in ('MBR-1001', 'MBR-1002')
where g.group_number = 'GRP-1001'
on conflict (group_id, member_id) do nothing;

insert into public.loans (
  loan_number,
  member_id,
  loan_type,
  loan_category,
  principal_amount,
  disbursement_date,
  security_amount,
  cycle_count,
  weekly_installment,
  monthly_installment,
  amount_withdrawn,
  outstanding_balance,
  overdue_amount,
  interest_rate,
  duration_months,
  status
)
select
  'LN-1001',
  m.id,
  'binafsi',
  'binafsi',
  1200000,
  current_date,
  150000,
  1,
  60000,
  240000,
  1100000,
  1200000,
  0,
  12,
  6,
  'active'
from public.members m
where m.member_number = 'MBR-1001'
on conflict (loan_number) do nothing;

insert into public.insurance_policies (
  member_id,
  policy_number,
  policy_type,
  premium_amount,
  coverage_amount,
  start_date,
  end_date,
  status
)
select
  m.id,
  'POL-1001',
  'Life',
  45000,
  3000000,
  current_date,
  current_date + interval '12 months',
  'active'
from public.members m
where m.member_number = 'MBR-1001'
on conflict (policy_number) do nothing;