import {createClient} from '@/lib/supabase/server';
import type {
  LoanRecord,
  LoanType,
  MarejeshoRow,
  MarejeshoSchedule,
  LoanStatus,
  GroupView,
  GroupSummary,
  GroupMemberDetail,
  GroupDetail,
  MemberOption,
  AdmissionBookRow,
  AdmissionGroup,
  InsuranceView
} from '@/types';
import {checkAndExtendLoanIfOverdue} from './actions/loan-utils';
import {addMonthsToDateOnly} from '@/lib/date-only';

type LoanRow = {
  id: string;
  loan_number: string;
  loan_type: LoanType;
  item_description?: string | null;
  cycle_count: number;
  security_amount: number;
  principal_amount: number;
  disbursement_date: string;
  weekly_installment: number;
  outstanding_balance: number;
  overdue_amount: number;
  repayment_frequency?: 'weekly' | 'daily' | 'monthly' | null;
  duration_months?: number | null;
  amount_withdrawn?: number | null;
  interest_rate?: number | null;
  days_overdue?: number | null;
  return_start_date?: string | null;
  status: 'active' | 'closed' | 'defaulted' | 'pending';
  members:
    | {id: string; member_number: string; full_name: string; phone: string | null}
    | {id: string; member_number: string; full_name: string; phone: string | null}[]
    | null;
};

function pickSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type OverdueMetrics = {
  daysOverdue: number;
  overdueAmount: number;
  totalPaid: number;
};

function getTodayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonthsToIso(isoDate: string, months: number): string | null {
  if (months <= 0) {
    return null;
  }
  return addMonthsToDateOnly(isoDate, months);
}

function diffDays(isoFrom: string, isoTo: string): number {
  const [fromYear, fromMonth, fromDay] = isoFrom.split('-').map(Number);
  const [toYear, toMonth, toDay] = isoTo.split('-').map(Number);
  if (!fromYear || !fromMonth || !fromDay || !toYear || !toMonth || !toDay) {
    return 0;
  }
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.floor((fromUtc - toUtc) / 86400000);
}

async function getOverdueMetricsForLoans(
  supabase: ReturnType<typeof createClient>,
  loanIds: string[]
): Promise<Map<string, OverdueMetrics>> {
  const metrics = new Map<string, OverdueMetrics>();
  if (loanIds.length === 0) {
    return metrics;
  }

  const {data, error} = await supabase
    .from('loan_schedules')
    .select('loan_id, expected_date, expected_amount, paid_amount')
    .in('loan_id', loanIds);

  if (error || !data) {
    return metrics;
  }

  const todayStr = getTodayIsoLocal();

  data.forEach((row) => {
    if (!row.expected_date) {
      return;
    }
    const expectedAmount = Number(row.expected_amount ?? 0);
    const paidAmount = Number(row.paid_amount ?? 0);
    if (paidAmount >= expectedAmount) {
      return;
    }
    const expectedDateStr = row.expected_date;
    // Not overdue if due date is today or in the future
    if (expectedDateStr >= todayStr) {
      return;
    }
    const [year, month, day] = expectedDateStr.split('-').map(Number);
    if (!year || !month || !day) {
      return;
    }
    const expectedUtc = Date.UTC(year, month - 1, day);
    const todayUtc = Date.UTC(
      Number(todayStr.slice(0, 4)),
      Number(todayStr.slice(5, 7)) - 1,
      Number(todayStr.slice(8, 10))
    );
    const overdueDays = Math.max(0, Math.floor((todayUtc - expectedUtc) / 86400000));

    const current = metrics.get(row.loan_id) ?? {daysOverdue: 0, overdueAmount: 0, totalPaid: 0};
    current.overdueAmount += Math.max(expectedAmount - paidAmount, 0);
    current.daysOverdue = Math.max(current.daysOverdue, overdueDays);
    current.totalPaid += paidAmount;
    metrics.set(row.loan_id, current);
  });

  return metrics;
}

function toLoanRecord(row: LoanRow): LoanRecord {
  const member = pickSingleRelation(row.members);

  return {
    id: row.id,
    memberId: member?.id ?? '',
    memberNumber: member?.member_number ?? '-',
    memberName: member?.full_name ?? '-',
    memberPhone: member?.phone ?? null,
    itemDescription: row.item_description ?? null,
    cycle: row.cycle_count,
    securityAmount: Number(row.security_amount ?? 0),
    loanNumber: row.loan_number,
    disbursementAmount: Number(row.principal_amount ?? 0),
    disbursementDate: row.disbursement_date,
    installmentSize: Number(row.weekly_installment ?? 0),
    outstandingBalance: Number(row.outstanding_balance ?? 0),
    overdueAmount: Number(row.overdue_amount ?? 0),
    status: row.status as any,
    loanType: row.loan_type,
    repaymentFrequency: (row.repayment_frequency ?? 'weekly') as
      | 'weekly'
      | 'daily'
      | 'monthly',
    durationMonths: Number(row.duration_months ?? 0) || 0,
    amountPaid: Number(row.amount_withdrawn ?? 0),
    interestRate: Number(row.interest_rate ?? 0),
    daysOverdue: Number(row.days_overdue ?? 0),
    returnStartDate: row.return_start_date ?? null
  };
}

const loanSelectFields = (includeReturnStart: boolean) =>
  includeReturnStart
    ? 'id,loan_number,loan_type,item_description,cycle_count,security_amount,principal_amount,disbursement_date,weekly_installment,outstanding_balance,overdue_amount,repayment_frequency,duration_months,amount_withdrawn,interest_rate,days_overdue,return_start_date,status,members!inner(id,member_number,full_name,phone)'
    : 'id,loan_number,loan_type,item_description,cycle_count,security_amount,principal_amount,disbursement_date,weekly_installment,outstanding_balance,overdue_amount,repayment_frequency,duration_months,amount_withdrawn,interest_rate,days_overdue,status,members!inner(id,member_number,full_name,phone)';

const loanSelectFieldsOuter = (includeReturnStart: boolean) =>
  includeReturnStart
    ? 'id,loan_number,loan_type,item_description,cycle_count,security_amount,principal_amount,disbursement_date,weekly_installment,outstanding_balance,overdue_amount,repayment_frequency,duration_months,amount_withdrawn,interest_rate,days_overdue,return_start_date,status,members(id,member_number,full_name,phone)'
    : 'id,loan_number,loan_type,item_description,cycle_count,security_amount,principal_amount,disbursement_date,weekly_installment,outstanding_balance,overdue_amount,repayment_frequency,duration_months,amount_withdrawn,interest_rate,days_overdue,status,members(id,member_number,full_name,phone)';

export type LoanSort =
  | 'newest'
  | 'oldest'
  | 'sno_asc'
  | 'sno_desc'
  | 'name_asc'
  | 'name_desc';

export async function getLoansByType(
  loanType: LoanType,
  query?: string,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  sort: LoanSort = 'newest'
): Promise<{ data: LoanRecord[]; count: number }> {
  const supabase = createClient();
  const PAGE_SIZE = 50;

  const buildQuery = (includeReturnStart: boolean) =>
    supabase
      .from('loans')
      .select(loanSelectFields(includeReturnStart), {count: 'exact'})
      .eq('loan_type', loanType);

  let dbQuery = buildQuery(true);

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

  switch (sort) {
    case 'oldest':
      dbQuery = dbQuery.order('created_at', {ascending: true});
      break;
    case 'sno_asc':
      dbQuery = dbQuery.order('member_number', {
        ascending: true,
        foreignTable: 'members'
      });
      break;
    case 'sno_desc':
      dbQuery = dbQuery.order('member_number', {
        ascending: false,
        foreignTable: 'members'
      });
      break;
    case 'name_asc':
      dbQuery = dbQuery.order('full_name', {
        ascending: true,
        foreignTable: 'members'
      });
      break;
    case 'name_desc':
      dbQuery = dbQuery.order('full_name', {
        ascending: false,
        foreignTable: 'members'
      });
      break;
    case 'newest':
    default:
      dbQuery = dbQuery.order('created_at', {ascending: false});
      break;
  }

  let {data, count, error} = await dbQuery.range(from, to);

  if (error && error.message?.includes('return_start_date')) {
    dbQuery = buildQuery(false);
    ({data, count, error} = await dbQuery.range(from, to));
  }

  if (error || !data) {
    return { data: [], count: 0 };
  }

  const records = (data as unknown as LoanRow[]).map(toLoanRecord);

  // Trigger auto-extensions for binafsi loans in parallel
  if (loanType === 'binafsi') {
    await Promise.all(
      records
        .filter((r) => r.status === 'active')
        .map((r) => checkAndExtendLoanIfOverdue(r.id).catch(() => null))
    );
  }

  const overdueMetrics = await getOverdueMetricsForLoans(
    supabase,
    records.map((record) => record.id)
  );

  return {
    data: records.map((record) => {
      if (record.outstandingBalance <= 0) {
        return {...record, daysOverdue: 0, overdueAmount: 0};
      }
      if (record.loanType === 'binafsi') {
        const durationMonths =
          record.durationMonths && record.durationMonths > 0
            ? record.durationMonths
            : record.cycle;
        const returnDate = addMonthsToIso(record.disbursementDate, durationMonths);
        if (!returnDate) {
          return {...record, daysOverdue: 0, overdueAmount: 0};
        }
        const todayStr = getTodayIsoLocal();
        const daysOverdue = Math.max(0, diffDays(todayStr, returnDate));
        const metrics = overdueMetrics.get(record.id);
        return {
          ...record,
          daysOverdue,
          overdueAmount: daysOverdue > 0 ? record.overdueAmount : 0,
          amountPaid: metrics?.totalPaid ?? record.amountPaid
        };
      }
      const metrics = overdueMetrics.get(record.id);
      if (!metrics) {
        return {...record, daysOverdue: 0, overdueAmount: 0};
      }
      return {
        ...record,
        daysOverdue: metrics.daysOverdue,
        overdueAmount: metrics.overdueAmount,
        amountPaid: metrics.totalPaid
      };
    }),
    count: count ?? 0
  };
}

export async function getAllLoans(): Promise<LoanRecord[]> {
  const supabase = createClient();
  let {data, error} = await supabase
    .from('loans')
    .select(loanSelectFieldsOuter(true))
    .order('created_at', {ascending: false});

  if (error && error.message?.includes('return_start_date')) {
    ({data, error} = await supabase
      .from('loans')
      .select(loanSelectFieldsOuter(false))
      .order('created_at', {ascending: false}));
  }

  if (error || !data) {
    return [];
  }

  const records = (data as unknown as LoanRow[]).map(toLoanRecord);
  const overdueMetrics = await getOverdueMetricsForLoans(
    supabase,
    records.map((record) => record.id)
  );

  return records.map((record) => {
    if (record.outstandingBalance <= 0) {
      return {...record, daysOverdue: 0, overdueAmount: 0};
    }
    if (record.loanType === 'binafsi') {
      const durationMonths =
        record.durationMonths && record.durationMonths > 0
          ? record.durationMonths
          : record.cycle;
      const returnDate = addMonthsToIso(record.disbursementDate, durationMonths);
      if (!returnDate) {
        return {...record, daysOverdue: 0, overdueAmount: 0};
      }
      const todayStr = getTodayIsoLocal();
      const daysOverdue = Math.max(0, diffDays(todayStr, returnDate));
      return {
        ...record,
        daysOverdue,
        overdueAmount: daysOverdue > 0 ? record.overdueAmount : 0
      };
    }
    const metrics = overdueMetrics.get(record.id);
    if (!metrics) {
      return {...record, daysOverdue: 0, overdueAmount: 0};
    }
    return {
      ...record,
      daysOverdue: metrics.daysOverdue,
      overdueAmount: metrics.overdueAmount
    };
  });
}

// Marejesho types moved to types/index.ts

type MarejeshoRowRaw = {
  id: string;
  loan_number: string;
  loan_type: LoanType;
  cycle_count: number;
  security_amount: number;
  disbursement_date: string;
  weekly_installment: number;
  outstanding_balance: number;
  status: 'active' | 'closed' | 'defaulted' | 'pending';
  members:
    | {member_number: string; full_name: string}
    | {member_number: string; full_name: string}[]
    | null;
  loan_schedules:
    | {expected_date: string; expected_amount: number; paid_amount: number}[]
    | null;
};

export async function getMarejeshoReportRows(): Promise<MarejeshoRow[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('loans')
    .select(
      'id,loan_number,loan_type,cycle_count,security_amount,disbursement_date,weekly_installment,outstanding_balance,status,members(member_number,full_name),loan_schedules(expected_date,expected_amount,paid_amount)'
    )
    .order('created_at', {ascending: false});

  if (error || !data) {
    return [];
  }

  return (data as unknown as MarejeshoRowRaw[]).map((row) => {
    const member = pickSingleRelation(row.members);
    return {
      id: row.id,
      memberNumber: member?.member_number ?? '-',
      memberName: member?.full_name ?? '-',
      loanNumber: row.loan_number,
      loanType: row.loan_type,
      cycle: row.cycle_count,
      securityAmount: Number(row.security_amount ?? 0),
      disbursementDate: row.disbursement_date,
      installmentAmount: Number(row.weekly_installment ?? 0),
      outstandingBalance: Number(row.outstanding_balance ?? 0),
      overdueAmount: 0,
      status: row.status as LoanStatus,
      schedules: (row.loan_schedules as any[] | null)?.map((s) => ({
        expectedDate: s.expected_date,
        expectedAmount: Number(s.expected_amount ?? 0),
        paidAmount: Number(s.paid_amount ?? 0)
      })) ?? []
    };
  });
}

type DashboardRange = 'all' | 'month' | 'week';

type DashboardMetricOptions = {
  range?: DashboardRange;
  month?: string;
  week?: string;
};

export async function getDashboardMetrics(options: DashboardMetricOptions = {}) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const range: DashboardRange =
    options.range === 'month' ? 'month' : options.range === 'week' ? 'week' : 'all';

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month =
    options.month && /^\d{4}-\d{2}$/.test(options.month)
    ? options.month
    : defaultMonth;

  const parseWeekStart = (weekKey: string) => {
    const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const week = Number(match[2]);
    if (!year || !week) return null;
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const week1Start = new Date(jan4);
    week1Start.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
    const start = new Date(week1Start);
    start.setUTCDate(week1Start.getUTCDate() + (week - 1) * 7);
    return start.toISOString().slice(0, 10);
  };

  const defaultWeek = (() => {
    const base = new Date();
    const utcDate = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  })();

  const weekKey =
    options.week && /^\d{4}-W\d{2}$/.test(options.week) ? options.week : defaultWeek;

  const [year, monthIndex] = month.split('-').map(Number);

  let startDate: string | null = null;
  let endDate: string | null = null;
  if (range === 'month' && year && monthIndex) {
    startDate = new Date(year, monthIndex - 1, 1).toISOString().slice(0, 10);
    endDate = new Date(year, monthIndex, 0).toISOString().slice(0, 10);
  } else if (range === 'week') {
    const weekStart = parseWeekStart(weekKey);
    if (weekStart) {
      startDate = weekStart;
      const start = new Date(`${weekStart}T00:00:00Z`);
      start.setUTCDate(start.getUTCDate() + 6);
      endDate = start.toISOString().slice(0, 10);
    }
  }

  let activeLoansQuery = supabase
    .from('loans')
    .select('*', {count: 'exact', head: true})
    .eq('status', 'active');

  let disbursedQuery = supabase.from('loans').select('principal_amount,disbursement_date');

  let loanTypeQuery = supabase
    .from('loans')
    .select('loan_type,status,principal_amount,outstanding_balance,amount_withdrawn,disbursement_date');

  if (range !== 'all' && startDate && endDate) {
    activeLoansQuery = activeLoansQuery
      .gte('disbursement_date', startDate)
      .lte('disbursement_date', endDate);
    disbursedQuery = disbursedQuery
      .gte('disbursement_date', startDate)
      .lte('disbursement_date', endDate);
    loanTypeQuery = loanTypeQuery
      .gte('disbursement_date', startDate)
      .lte('disbursement_date', endDate);
  }

  let scheduleQuery = supabase
    .from('loan_schedules')
    .select('loan_id,expected_amount,paid_amount,expected_date,loans!inner(loan_type)');

  const scheduleRangeQuery =
    range !== 'all' && startDate && endDate
      ? scheduleQuery.gte('expected_date', startDate).lte('expected_date', endDate)
      : scheduleQuery;

  const [
    {count: activeLoans},
    {data: disbursedRows},
    {data: scheduleRangeRows},
    {data: scheduleAllLoans},
    {count: members},
    {count: groups},
    {data: loanTypeRows}
  ] = await Promise.all([
    activeLoansQuery,
    disbursedQuery,
    scheduleRangeQuery,
    supabase
      .from('loans')
      .select('loan_schedules(expected_amount,paid_amount)'),
    supabase.from('members').select('*', {count: 'exact', head: true}),
    supabase.from('groups').select('*', {count: 'exact', head: true}),
    loanTypeQuery
  ]);

  const totalDisbursed = (disbursedRows ?? []).reduce(
    (sum, row) => sum + Number(row.principal_amount ?? 0),
    0
  );

  const totalCollections = (loanTypeRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount_withdrawn ?? 0),
    0
  );
  
  const totalScheduleRows = (scheduleAllLoans ?? []).flatMap(
    (row) =>
      (row as {loan_schedules?: Array<{expected_amount?: number; paid_amount?: number}>})
        .loan_schedules ?? []
  );

  const totalDue = totalScheduleRows.reduce(
    (sum, row) => sum + Number(row.expected_amount ?? 0),
    0
  );

  const overdueLoanIds = new Set<string>();
  const todayStr = today;
  (scheduleRangeRows ?? []).forEach((row) => {
    if (!row.expected_date) {
      return;
    }
    const expectedAmount = Number(row.expected_amount ?? 0);
    const paidAmount = Number(row.paid_amount ?? 0);
    if (paidAmount >= expectedAmount) {
      return;
    }
    if (row.expected_date >= todayStr) {
      return;
    }
    overdueLoanIds.add(row.loan_id);
  });

  const scheduleTotalsByType = (scheduleRangeRows ?? []).reduce(
    (acc, row) => {
      const loanType = (row as {loans?: {loan_type?: LoanType}}).loans?.loan_type;
      if (!loanType) {
        return acc;
      }
      if (!acc[loanType]) {
        acc[loanType] = {dueAmount: 0, collectedAmount: 0};
      }
      acc[loanType].dueAmount += Number(row.expected_amount ?? 0);
      acc[loanType].collectedAmount += Number(row.paid_amount ?? 0);
      return acc;
    },
    {} as Record<LoanType, {dueAmount: number; collectedAmount: number}>
  );

  const loanTypeMetrics = (loanTypeRows ?? []).reduce(
    (acc, row) => {
      const type = row.loan_type as LoanType;
      if (!acc[type]) {
        acc[type] = {
          loanType: type,
          totalCount: 0,
          activeCount: 0,
          disbursedAmount: 0,
          outstandingBalance: 0,
          dueAmount: 0,
          collectedAmount: 0
        };
      }
      acc[type].totalCount += 1;
      if (row.status === 'active') {
        acc[type].activeCount += 1;
      }
      acc[type].disbursedAmount += Number(row.principal_amount ?? 0);
      acc[type].outstandingBalance += Number(row.outstanding_balance ?? 0);
      acc[type].collectedAmount += Number(row.amount_withdrawn ?? 0);
      return acc;
    },
    {} as Record<
      LoanType,
      {
        loanType: LoanType;
        totalCount: number;
        activeCount: number;
        disbursedAmount: number;
        outstandingBalance: number;
        dueAmount: number;
        collectedAmount: number;
      }
    >
  );

  Object.entries(scheduleTotalsByType).forEach(([type, totals]) => {
    const loanType = type as LoanType;
    if (!loanTypeMetrics[loanType]) {
      loanTypeMetrics[loanType] = {
        loanType,
        totalCount: 0,
        activeCount: 0,
        disbursedAmount: 0,
        outstandingBalance: 0,
        dueAmount: 0,
        collectedAmount: 0
      };
    }
    loanTypeMetrics[loanType].dueAmount = totals.dueAmount;
    loanTypeMetrics[loanType].collectedAmount = totals.collectedAmount;
  });

  const totalOutstanding = (loanTypeRows ?? []).reduce(
    (sum, row) => sum + Number(row.outstanding_balance ?? 0),
    0
  );
  const totalDefaulted = (loanTypeRows ?? []).filter(
    (row) => row.status === 'defaulted'
  ).length;
  const totalLoans = (loanTypeRows ?? []).length;

  return {
    totalActiveLoans: activeLoans ?? 0,
    totalDisbursed,
    totalCollections,
    totalDue,
    overdueLoans: overdueLoanIds.size,
    totalOutstanding,
    totalDefaulted,
    totalLoans,
    activeMembers: members ?? 0,
    activeGroups: groups ?? 0,
    loanTypeMetrics
  };
}

// GroupView moved to @/types/index.ts

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
    groupName: group.group_name,
    groupNumber: group.group_number,
    members:
      (group.group_members as unknown as GroupRelationRow[] | null)
        ?.map((row) => pickSingleRelation(row.members)?.full_name)
        .filter((value): value is string => Boolean(value)) ?? []
  }));
}

// Group types moved to @/types/index.ts

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
    name: group.group_name,
    number: group.group_number,
    groupName: group.group_name,
    groupNumber: group.group_number,
    groupType: group.group_type,
    createdAt: group.created_at,
    memberCount: (group.group_members as {id: string}[] | null)?.length ?? 0
  }));
}

export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const supabase = createClient();
  const baseSelect =
    'id,group_name,group_number,group_type,created_at,group_members(id,role_in_group,members(id,member_number,full_name,phone,admission_books(has_book)))';
  let {data, error} = await supabase
    .from('groups')
    .select(baseSelect)
    .eq('id', groupId)
    .single();

  if (error || !data) {
    const fallback = await supabase
      .from('groups')
      .select(
        'id,group_name,group_number,group_type,created_at,group_members(id,role_in_group,members(id,member_number,full_name,phone))'
      )
      .eq('id', groupId)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    return null;
  }

  const members = ((data.group_members ?? []) as unknown as Array<{
    id: string;
    role_in_group: string | null;
    members:
      | {id: string; member_number: string; full_name: string; phone: string | null; admission_books?: {has_book: boolean}[] | null}
      | {id: string; member_number: string; full_name: string; phone: string | null; admission_books?: {has_book: boolean}[] | null}[]
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
        roleInGroup: row.role_in_group,
        hasBook: Boolean(member.admission_books?.[0]?.has_book)
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

export async function getLoansByGroup(groupId: string): Promise<LoanRecord[]> {
  const supabase = createClient();
  let {data, error} = await supabase
    .from('loans')
    .select(loanSelectFieldsOuter(true))
    .eq('group_id', groupId)
    .order('created_at', {ascending: false});

  if (error && error.message?.includes('return_start_date')) {
    ({data, error} = await supabase
      .from('loans')
      .select(loanSelectFieldsOuter(false))
      .eq('group_id', groupId)
      .order('created_at', {ascending: false}));
  }

  if (error || !data) {
    return [];
  }

  const records = (data as unknown as LoanRow[]).map(toLoanRecord);
  const overdueMetrics = await getOverdueMetricsForLoans(
    supabase,
    records.map((record) => record.id)
  );

  return records.map((record) => {
    if (record.outstandingBalance <= 0) {
      return {...record, daysOverdue: 0, overdueAmount: 0};
    }
    if (record.loanType === 'binafsi') {
      const durationMonths =
        record.durationMonths && record.durationMonths > 0
          ? record.durationMonths
          : record.cycle;
      const returnDate = addMonthsToIso(record.disbursementDate, durationMonths);
      if (!returnDate) {
        return {...record, daysOverdue: 0, overdueAmount: 0};
      }
      const todayStr = getTodayIsoLocal();
      const daysOverdue = Math.max(0, diffDays(todayStr, returnDate));
      return {
        ...record,
        daysOverdue,
        overdueAmount: daysOverdue > 0 ? record.overdueAmount : 0
      };
    }
    const metrics = overdueMetrics.get(record.id);
    if (!metrics) {
      return {...record, daysOverdue: 0, overdueAmount: 0};
    }
    return {
      ...record,
      daysOverdue: metrics.daysOverdue,
      overdueAmount: metrics.overdueAmount
    };
  });
}

// Admission types moved to @/types/index.ts

export async function getAdmissionGroups(): Promise<AdmissionGroup[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('groups')
    .select('id,group_name,group_number')
    .order('group_name', {ascending: true});

  if (error || !data) {
    return [];
  }

  return data.map((group) => ({
    id: group.id,
    name: group.group_name,
    number: group.group_number
  }));
}

export async function getAdmissionBookRows(): Promise<AdmissionBookRow[]> {
  const supabase = createClient();
  type AdmissionRow = {
    group_id: string;
    groups: {group_name: string; group_number: string} | null;
    members:
      | {
          id: string;
          member_number: string;
          full_name: string;
          phone: string | null;
          admission_books?: {has_book: boolean}[] | null;
        }
      | null;
  };

  let data: AdmissionRow[] | null = null;
  let error: unknown = null;

  const primary = await supabase
    .from('group_members')
    .select(
      'group_id,groups(group_name,group_number),members(id,member_number,full_name,phone,admission_books(has_book))'
    )
    .order('created_at', {ascending: true});
  data = primary.data as AdmissionRow[] | null;
  error = primary.error;

  if (error || !data) {
    const fallback = await supabase
      .from('group_members')
      .select('group_id,groups(group_name,group_number),members(id,member_number,full_name,phone)')
      .order('created_at', {ascending: true});
    data = fallback.data as AdmissionRow[] | null;
    error = fallback.error;
  }

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    groupId: row.group_id,
    groupName: row.groups?.group_name ?? '-',
    groupNumber: row.groups?.group_number ?? '-',
    memberId: row.members?.id ?? '',
    memberNumber: row.members?.member_number ?? '-',
    fullName: row.members?.full_name ?? '-',
    phone: row.members?.phone ?? null,
    hasBook: Boolean(row.members?.admission_books?.[0]?.has_book)
  }));
}

// InsuranceView moved to types/index.ts

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
