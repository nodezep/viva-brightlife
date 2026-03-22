import {createAdminClient} from '@/lib/supabase/admin';

export type UpcomingDueReminder = {
  scheduleId: string;
  loanId: string;
  loanNumber: string;
  memberName: string;
  phone: string | null;
  expectedDate: string;
  expectedAmount: number;
  paidAmount: number;
  amountDue: number;
  daysUntil: number;
  reminderStatus: 'not_scheduled' | 'queued' | 'sent' | 'failed' | 'delivered' | 'cancelled';
  reminderScheduledFor: string | null;
  reminderSentAt: string | null;
};

type UpcomingSchedule = {
  id: string;
  loan_id: string;
  expected_date: string;
  expected_amount: number;
  paid_amount: number;
  loans:
    | {
        id: string;
        loan_number: string;
        outstanding_balance: number;
        status: string;
        repayment_frequency?: 'weekly' | 'daily' | null;
        members:
          | {id: string; full_name: string; phone: string | null}
          | {id: string; full_name: string; phone: string | null}[]
          | null;
      }
    | null;
};

type ReminderRow = {
  loan_id: string;
  reminder_key: string;
  status: string;
  delivery_status: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getTodayIsoLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToIso(isoDate: string, days: number) {
  const base = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return isoDate;
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
}

function diffDays(isoFrom: string, isoTo: string) {
  const [fromYear, fromMonth, fromDay] = isoFrom.split('-').map(Number);
  const [toYear, toMonth, toDay] = isoTo.split('-').map(Number);
  if (!fromYear || !fromMonth || !fromDay || !toYear || !toMonth || !toDay) {
    return 0;
  }
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.floor((fromUtc - toUtc) / 86400000);
}

function getWindowDays(input?: number) {
  if (Number.isFinite(input) && (input as number) > 0) {
    return Math.floor(input as number);
  }
  const parsed = Number(process.env.SMS_DUE_SOON_DAYS ?? 3);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 3;
}

function buildDueSoonReminderKey(expectedDate: string) {
  return `due_soon_${expectedDate}`;
}

export async function getUpcomingDueReminders(options?: {
  windowDays?: number;
  limit?: number;
}): Promise<UpcomingDueReminder[]> {
  const supabase = createAdminClient();
  const today = getTodayIsoLocal();
  const windowDays = getWindowDays(options?.windowDays);
  const endDate = addDaysToIso(today, windowDays);
  const limit = options?.limit ?? 60;

  const {data, error} = await supabase
    .from('loan_schedules')
    .select(
      'id,loan_id,expected_date,expected_amount,paid_amount,loans!inner(id,loan_number,outstanding_balance,status,repayment_frequency,members(id,full_name,phone))'
    )
    .eq('status', 'pending')
    .gte('expected_date', today)
    .lte('expected_date', endDate)
    .order('expected_date', {ascending: true})
    .limit(Math.max(5, limit));

  if (error || !data) {
    return [];
  }

  const schedules = (data as UpcomingSchedule[])
    .map((row) => {
      const loan = row.loans;
      if (!loan || loan.status !== 'active') {
        return null;
      }
      if (loan.repayment_frequency === 'daily') {
        return null;
      }
      if (Number(loan.outstanding_balance ?? 0) <= 0) {
        return null;
      }
      const member = pickOne(loan.members);
      if (!member) {
        return null;
      }
      const expectedAmount = Number(row.expected_amount ?? 0);
      const paidAmount = Number(row.paid_amount ?? 0);
      const amountDue = Math.max(0, expectedAmount - paidAmount);
      if (amountDue <= 0) {
        return null;
      }
      const daysUntil = Math.max(0, diffDays(row.expected_date, today));
      return {
        scheduleId: row.id,
        loanId: row.loan_id,
        loanNumber: loan.loan_number,
        memberName: member.full_name,
        phone: member.phone ?? null,
        expectedDate: row.expected_date,
        expectedAmount,
        paidAmount,
        amountDue,
        daysUntil,
        reminderKey: buildDueSoonReminderKey(row.expected_date)
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (schedules.length === 0) {
    return [];
  }

  const loanIds = Array.from(new Set(schedules.map((row) => row.loanId)));
  const reminderKeys = Array.from(new Set(schedules.map((row) => row.reminderKey)));

  const {data: reminderRows} = await supabase
    .from('sms_reminders')
    .select('loan_id,reminder_key,status,delivery_status,scheduled_for,sent_at')
    .in('loan_id', loanIds)
    .in('reminder_key', reminderKeys);

  const reminderMap = new Map<string, ReminderRow>();
  (reminderRows as ReminderRow[] | null | undefined)?.forEach((row) => {
    reminderMap.set(`${row.loan_id}|${row.reminder_key}`, row);
  });

  return schedules
    .slice(0, limit)
    .map((row) => {
      const reminder = reminderMap.get(`${row.loanId}|${row.reminderKey}`);
      const status =
        (reminder?.delivery_status ?? reminder?.status ?? 'not_scheduled') as UpcomingDueReminder['reminderStatus'];
      return {
        scheduleId: row.scheduleId,
        loanId: row.loanId,
        loanNumber: row.loanNumber,
        memberName: row.memberName,
        phone: row.phone,
        expectedDate: row.expectedDate,
        expectedAmount: row.expectedAmount,
        paidAmount: row.paidAmount,
        amountDue: row.amountDue,
        daysUntil: row.daysUntil,
        reminderStatus: status,
        reminderScheduledFor: reminder?.scheduled_for ?? null,
        reminderSentAt: reminder?.sent_at ?? null
      };
    });
}
