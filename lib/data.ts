import {createClient} from '@/lib/supabase/server';
import type {LoanRecord, LoanType} from '@/types';

type LoanRow = {
  id: string;
  loan_number: string;
  loan_type: LoanType;
  cycle_count: number;
  security_amount: number;
  principal_amount: number;
  disbursement_date: string;
  weekly_installment: number;
  monthly_installment: number;
  amount_withdrawn: number;
  outstanding_balance: number;
  overdue_amount: number;
  status: 'active' | 'closed' | 'defaulted' | 'pending';
  members:
    | {member_number: string; full_name: string}
    | {member_number: string; full_name: string}[]
    | null;
};

function pickSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toLoanRecord(row: LoanRow): LoanRecord {
  const member = pickSingleRelation(row.members);

  return {
    id: row.id,
    memberNumber: member?.member_number ?? '-',
    memberName: member?.full_name ?? '-',
    cycle: row.cycle_count,
    securityAmount: Number(row.security_amount ?? 0),
    loanNumber: row.loan_number,
    disbursementAmount: Number(row.principal_amount ?? 0),
    disbursementDate: row.disbursement_date,
    weeklyInstallment: Number(row.weekly_installment ?? 0),
    monthlyInstallment: Number(row.monthly_installment ?? 0),
    amountWithdrawn: Number(row.amount_withdrawn ?? 0),
    outstandingBalance: Number(row.outstanding_balance ?? 0),
    overdueAmount: Number(row.overdue_amount ?? 0),
    status: row.status,
    loanType: row.loan_type
  };
}

export async function getLoansByType(
  loanType: LoanType,
  query?: string,
  startDate?: string,
  endDate?: string,
  page: number = 1
): Promise<{ data: LoanRecord[]; count: number }> {
  const supabase = createClient();
  const PAGE_SIZE = 50;

  let dbQuery = supabase
    .from('loans')
    .select(
      'id,loan_number,loan_type,cycle_count,security_amount,principal_amount,disbursement_date,weekly_installment,monthly_installment,amount_withdrawn,outstanding_balance,overdue_amount,status,members!inner(member_number,full_name)',
      { count: 'exact' }
    )
    .eq('loan_type', loanType);

  if (query) {
    // Only search members full name for safety, or check if query is numbers
    if (/^\\d+$/.test(query)) {
      dbQuery = dbQuery.ilike('loan_number', `%${query}%`);
    } else {
      dbQuery = dbQuery.ilike('members.full_name', `%${query}%`);
    }
  }

  if (startDate) {
    dbQuery = dbQuery.gte('disbursement_date', startDate);
  }

  if (endDate) {
    dbQuery = dbQuery.lte('disbursement_date', endDate);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await dbQuery
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { data: [], count: 0 };
  }

  return {
    data: (data as unknown as LoanRow[]).map(toLoanRecord),
    count: count ?? 0
  };
}

export async function getAllLoans(): Promise<LoanRecord[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('loans')
    .select(
      'id,loan_number,loan_type,cycle_count,security_amount,principal_amount,disbursement_date,weekly_installment,monthly_installment,amount_withdrawn,outstanding_balance,overdue_amount,status,members(member_number,full_name)'
    )
    .order('created_at', {ascending: false});

  if (error || !data) {
    return [];
  }

  return (data as unknown as LoanRow[]).map(toLoanRecord);
}

export async function getDashboardMetrics() {
  const supabase = createClient();

  const [
    {count: activeLoans},
    {data: disbursedRows},
    {data: repaymentRows},
    {count: overdueLoans},
    {count: members},
    {count: groups}
  ] = await Promise.all([
    supabase
      .from('loans')
      .select('*', {count: 'exact', head: true})
      .eq('status', 'active'),
    supabase
      .from('loans')
      .select('principal_amount,disbursement_date')
      .gte(
        'disbursement_date',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .slice(0, 10)
      ),
    supabase.from('repayments').select('amount'),
    supabase
      .from('loans')
      .select('*', {count: 'exact', head: true})
      .gt('overdue_amount', 0),
    supabase.from('members').select('*', {count: 'exact', head: true}),
    supabase.from('groups').select('*', {count: 'exact', head: true})
  ]);

  const totalDisbursedThisMonth = (disbursedRows ?? []).reduce(
    (sum, row) => sum + Number(row.principal_amount ?? 0),
    0
  );

  const totalCollections = (repaymentRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );

  return {
    totalActiveLoans: activeLoans ?? 0,
    totalDisbursedThisMonth,
    totalCollections,
    overdueLoans: overdueLoans ?? 0,
    activeMembers: members ?? 0,
    activeGroups: groups ?? 0
  };
}

export type GroupView = {
  id: string;
  name: string;
  number: string;
  members: string[];
};

type GroupRelationRow = {
  members: {full_name: string} | {full_name: string}[] | null;
};

export async function getGroupsWithMembers(): Promise<GroupView[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('groups')
    .select('id,group_name,group_number,group_members(members(full_name))');

  if (error || !data) {
    return [];
  }

  return data.map((group) => ({
    id: group.id,
    name: group.group_name,
    number: group.group_number,
    members:
      (group.group_members as unknown as GroupRelationRow[] | null)
        ?.map((row) => pickSingleRelation(row.members)?.full_name)
        .filter((value): value is string => Boolean(value)) ?? []
  }));
}

export type GroupSummary = {
  id: string;
  groupName: string;
  groupNumber: string;
  groupType: string;
  createdAt: string;
  memberCount: number;
};

export type GroupMemberDetail = {
  id: string;
  memberId: string;
  memberNumber: string;
  fullName: string;
  phone: string | null;
  roleInGroup: string | null;
};

export type GroupDetail = {
  id: string;
  groupName: string;
  groupNumber: string;
  groupType: string;
  createdAt: string;
  members: GroupMemberDetail[];
};

export type MemberOption = {
  id: string;
  memberNumber: string;
  fullName: string;
  phone: string | null;
};

export async function getGroupsSummary(): Promise<GroupSummary[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('groups')
    .select('id,group_name,group_number,group_type,created_at,group_members(id)')
    .order('created_at', {ascending: false});

  if (error || !data) {
    return [];
  }

  return data.map((group) => ({
    id: group.id,
    groupName: group.group_name,
    groupNumber: group.group_number,
    groupType: group.group_type,
    createdAt: group.created_at,
    memberCount: (group.group_members as {id: string}[] | null)?.length ?? 0
  }));
}

export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('groups')
    .select(
      'id,group_name,group_number,group_type,created_at,group_members(id,role_in_group,members(id,member_number,full_name,phone))'
    )
    .eq('id', groupId)
    .single();

  if (error || !data) {
    return null;
  }

  const members = ((data.group_members ?? []) as unknown as Array<{
    id: string;
    role_in_group: string | null;
    members:
      | {id: string; member_number: string; full_name: string; phone: string | null}
      | {id: string; member_number: string; full_name: string; phone: string | null}[]
      | null;
  }>)
    .map((row) => {
      const member = pickSingleRelation(row.members);
      if (!member) {
        return null;
      }

      return {
        id: row.id,
        memberId: member.id,
        memberNumber: member.member_number,
        fullName: member.full_name,
        phone: member.phone ?? null,
        roleInGroup: row.role_in_group
      };
    })
    .filter((row): row is GroupMemberDetail => Boolean(row));

  return {
    id: data.id,
    groupName: data.group_name,
    groupNumber: data.group_number,
    groupType: data.group_type,
    createdAt: data.created_at,
    members
  };
}

export async function getMembersForGroupSelection(): Promise<MemberOption[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('members')
    .select('id,member_number,full_name,phone')
    .order('full_name', {ascending: true});

  if (error || !data) {
    return [];
  }

  return data.map((member) => ({
    id: member.id,
    memberNumber: member.member_number,
    fullName: member.full_name,
    phone: member.phone ?? null
  }));
}

export type InsuranceView = {
  id: string;
  policyNumber: string;
  memberName: string;
  policyType: string;
  premium: number;
  coverage: number;
  endDate: string;
  status: string;
};

type InsuranceRow = {
  id: string;
  policy_number: string;
  policy_type: string;
  premium_amount: number;
  coverage_amount: number;
  end_date: string;
  status: string;
  members: {full_name: string} | {full_name: string}[] | null;
};

export async function getInsurancePolicies(): Promise<InsuranceView[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('insurance_policies')
    .select(
      'id,policy_number,policy_type,premium_amount,coverage_amount,end_date,status,members(full_name)'
    )
    .order('created_at', {ascending: false});

  if (error || !data) {
    return [];
  }

  return (data as unknown as InsuranceRow[]).map((policy) => ({
    id: policy.id,
    policyNumber: policy.policy_number,
    memberName: pickSingleRelation(policy.members)?.full_name ?? '-',
    policyType: policy.policy_type,
    premium: Number(policy.premium_amount ?? 0),
    coverage: Number(policy.coverage_amount ?? 0),
    endDate: policy.end_date,
    status: policy.status
  }));
}
