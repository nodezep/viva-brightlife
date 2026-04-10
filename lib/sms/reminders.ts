import {createAdminClient} from '@/lib/supabase/admin';
import {sendSms} from './provider';
import {addDaysToDateOnly} from '@/lib/date-only';

type ReminderRule = {
  id: string;
  rule_key: string;
  days_overdue: number;
  send_hour_local: number;
};

type CandidateLoan = {
  id: string;
  loan_number: string;
  disbursement_date: string;
  duration_months: number;
  overdue_amount: number;
  outstanding_balance: number;
  repayment_frequency?: 'weekly' | 'daily' | 'monthly' | null;
  members:
    | {id: string; full_name: string; phone: string | null}
    | {id: string; full_name: string; phone: string | null}[]
    | null;
};

type TemplateRow = {
  language: string;
  body: string;
};

type PreferenceRow = {
  member_id: string;
  sms_enabled: boolean;
  preferred_language: string;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function calculateDaysOverdue(disbursementDate: string, durationMonths: number) {
  const disbursement = new Date(disbursementDate);
  const dueDate = new Date(disbursement);
  dueDate.setMonth(dueDate.getMonth() + Math.max(1, durationMonths));

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((now.getTime() - dueDate.getTime()) / msPerDay);
}

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? '' : String(value);
  });
}

async function getTemplates(templateKey: string) {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from('sms_templates')
    .select('language,body')
    .eq('template_key', templateKey)
    .eq('is_active', true);

  if (error || !data) {
    return new Map<string, string>();
  }

  return new Map((data as TemplateRow[]).map((row) => [row.language, row.body]));
}

function getTodayIsoLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToIso(isoDate: string, days: number) {
  return addDaysToDateOnly(isoDate, days) ?? isoDate;
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

function getDueSoonWindowDays() {
  const parsed = Number(process.env.SMS_DUE_SOON_DAYS ?? 3);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 3;
}

function getDueSoonSendHour() {
  const parsed = Number(process.env.SMS_DUE_SOON_HOUR ?? 9);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) {
    return Math.floor(parsed);
  }
  return 9;
}

function buildDueSoonReminderKey(expectedDate: string) {
  return `due_soon_${expectedDate}`;
}

async function getPreferences(memberIds: string[]) {
  if (memberIds.length === 0) {
    return new Map<string, PreferenceRow>();
  }

  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from('notification_preferences')
    .select('member_id,sms_enabled,preferred_language')
    .in('member_id', memberIds);

  if (error || !data) {
    return new Map<string, PreferenceRow>();
  }

  return new Map((data as PreferenceRow[]).map((row) => [row.member_id, row]));
}

async function getRecentlyMessagedMembers(memberIds: string[]) {
  if (memberIds.length === 0) {
    return new Set<string>();
  }
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const {data, error} = await supabase
    .from('sms_reminders')
    .select('member_id')
    .in('member_id', memberIds)
    .gte('created_at', since)
    .in('status', ['queued', 'pending_approval', 'sent']);

  if (error || !data) {
    return new Set<string>();
  }

  return new Set((data as {member_id: string}[]).map((row) => row.member_id));
}

export async function queueOverdueReminders() {
  const supabase = createAdminClient();

  const [{data: rulesData}, {data: loansData}, templates] = await Promise.all([
    supabase
      .from('sms_reminder_rules')
      .select('id,rule_key,days_overdue,send_hour_local')
      .eq('is_active', true)
      .order('days_overdue', {ascending: true}),
    supabase
      .from('loans')
      .select(
        'id,loan_number,disbursement_date,duration_months,overdue_amount,outstanding_balance,repayment_frequency,members(id,full_name,phone)'
      )
      .eq('status', 'active')
      .gt('outstanding_balance', 0),
    getTemplates('repayment_overdue')
  ]);

  const rules = (rulesData ?? []) as ReminderRule[];
  const loans = (loansData ?? []) as CandidateLoan[];

  const memberIds = loans
    .map((loan) => pickOne(loan.members)?.id)
    .filter((id): id is string => Boolean(id));

  const preferences = await getPreferences(memberIds);
  const recentlyMessaged = await getRecentlyMessagedMembers(memberIds);

  let queued = 0;

  for (const loan of loans) {
    const member = pickOne(loan.members);
    if (!member || !member.phone) {
      continue;
    }
    if (recentlyMessaged.has(member.id)) {
      continue;
    }
    if (loan.repayment_frequency === 'daily') {
      continue;
    }

    const pref = preferences.get(member.id);
    if (pref && pref.sms_enabled === false) {
      continue;
    }

    const daysOverdue = Math.max(
      loan.overdue_amount > 0 ? 1 : 0,
      calculateDaysOverdue(loan.disbursement_date, loan.duration_months)
    );

    if (daysOverdue <= 0) {
      continue;
    }

    for (const rule of rules) {
      if (daysOverdue < rule.days_overdue) {
        continue;
      }

      const language = pref?.preferred_language ?? 'sw';
      const template = templates.get(language) ?? templates.get('sw') ?? templates.get('en');
      if (!template) {
        continue;
      }

      const message = interpolateTemplate(template, {
        member_name: member.full_name,
        loan_number: loan.loan_number,
        overdue_amount: Number(loan.overdue_amount).toLocaleString(),
        days_overdue: daysOverdue,
        company_name: 'Viva Brightlife'
      });

      const now = new Date();
      const scheduled = new Date(now);
      scheduled.setHours(rule.send_hour_local, 0, 0, 0);
      if (scheduled.getTime() < now.getTime()) {
        scheduled.setDate(scheduled.getDate() + 1);
      }

      const {error} = await supabase.from('sms_reminders').upsert(
        {
          loan_id: loan.id,
          member_id: member.id,
          reminder_key: rule.rule_key,
          phone: member.phone,
          message,
          days_overdue: daysOverdue,
          scheduled_for: scheduled.toISOString(),
          status: 'pending_approval',
          delivery_status: 'queued',
          provider_name: process.env.SMS_PROVIDER ?? 'mock'
        },
        {onConflict: 'loan_id,reminder_key', ignoreDuplicates: true}
      );

      if (!error) {
        queued += 1;
      }
    }
  }

  return {queued};
}

type QueuedReminder = {
  id: string;
  phone: string;
  message: string;
  retry_count: number;
};

export async function dispatchQueuedReminders(limit = 100) {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from('sms_reminders')
    .select('id,phone,message,retry_count')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', {ascending: true})
    .limit(limit);

  if (error || !data) {
    return {sent: 0, failed: 0};
  }

  let sent = 0;
  let failed = 0;

  for (const reminder of data as QueuedReminder[]) {
    const result = await sendSms(reminder.phone, reminder.message);

    if (result.ok) {
      await supabase
        .from('sms_reminders')
        .update({
          status: 'sent',
          delivery_status: 'sent',
          provider_message_id: result.providerMessageId ?? null,
          sent_at: new Date().toISOString(),
          error_message: null,
          retry_count: reminder.retry_count
        })
        .eq('id', reminder.id);
      sent += 1;
      continue;
    }

    await supabase
      .from('sms_reminders')
      .update({
        status: reminder.retry_count >= 3 ? 'failed' : 'queued',
        delivery_status: reminder.retry_count >= 3 ? 'failed' : 'queued',
        error_message: result.error ?? 'Unknown SMS provider error',
        retry_count: reminder.retry_count + 1,
        scheduled_for:
          reminder.retry_count >= 3
            ? new Date().toISOString()
            : new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .eq('id', reminder.id);

    failed += 1;
  }

  return {sent, failed};
}

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
        repayment_frequency?: 'weekly' | 'daily' | 'monthly' | null;
        members:
          | {id: string; full_name: string; phone: string | null}
          | {id: string; full_name: string; phone: string | null}[]
          | null;
      }
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
      }[]
    | null;
};

export async function queueUpcomingReminders() {
  const supabase = createAdminClient();
  const today = getTodayIsoLocal();
  const windowDays = getDueSoonWindowDays();
  const endDate = addDaysToIso(today, windowDays);

  const [{data: scheduleRows}, templates] = await Promise.all([
    supabase
      .from('loan_schedules')
      .select(
        'id,loan_id,expected_date,expected_amount,paid_amount,loans!inner(id,loan_number,outstanding_balance,status,repayment_frequency,members(id,full_name,phone))'
      )
      .eq('status', 'pending')
      .gte('expected_date', today)
      .lte('expected_date', endDate)
      .order('expected_date', {ascending: true}),
    getTemplates('repayment_due_soon')
  ]);

  const schedules = (scheduleRows ?? []) as UpcomingSchedule[];
  const memberIds = schedules
    .map((row) => pickOne(pickOne(row.loans)?.members)?.id)
    .filter((id): id is string => Boolean(id));
  const preferences = await getPreferences(memberIds);
  const recentlyMessaged = await getRecentlyMessagedMembers(memberIds);

  let queued = 0;

  for (const schedule of schedules) {
    if (!schedule.expected_date) {
      continue;
    }
    const loan = pickOne(schedule.loans);
    if (!loan || loan.status !== 'active') {
      continue;
    }
    if (loan.repayment_frequency === 'daily') {
      continue;
    }
    if (Number(loan.outstanding_balance ?? 0) <= 0) {
      continue;
    }
    const member = pickOne(loan.members);
    if (!member || !member.phone) {
      continue;
    }
    if (recentlyMessaged.has(member.id)) {
      continue;
    }
    const pref = preferences.get(member.id);
    if (pref && pref.sms_enabled === false) {
      continue;
    }
    const expectedAmount = Number(schedule.expected_amount ?? 0);
    const paidAmount = Number(schedule.paid_amount ?? 0);
    const amountDue = Math.max(0, expectedAmount - paidAmount);
    if (amountDue <= 0) {
      continue;
    }
    const daysUntil = Math.max(0, diffDays(schedule.expected_date, today));
    if (daysUntil > windowDays) {
      continue;
    }

    const language = pref?.preferred_language ?? 'sw';
    const template = templates.get(language) ?? templates.get('sw') ?? templates.get('en');
    if (!template) {
      continue;
    }

    const message = interpolateTemplate(template, {
      member_name: member.full_name,
      loan_number: loan.loan_number,
      amount_due: amountDue.toLocaleString(),
      due_date: schedule.expected_date,
      days_until: daysUntil,
      company_name: 'Viva Brightlife'
    });

    const sendHour = getDueSoonSendHour();
    const scheduledLocal = new Date(`${schedule.expected_date}T${String(sendHour).padStart(2, '0')}:00:00`);
    const now = new Date();
    const scheduled =
      Number.isNaN(scheduledLocal.getTime()) || scheduledLocal.getTime() < now.getTime()
        ? new Date(now.getTime() + 60 * 1000)
        : scheduledLocal;

    const {error} = await supabase.from('sms_reminders').upsert(
      {
        loan_id: loan.id,
        member_id: member.id,
        reminder_key: buildDueSoonReminderKey(schedule.expected_date),
        phone: member.phone,
        message,
        days_overdue: 0,
        scheduled_for: scheduled.toISOString(),
        status: 'pending_approval',
        delivery_status: 'queued',
        provider_name: process.env.SMS_PROVIDER ?? 'mock'
      },
      {onConflict: 'loan_id,reminder_key', ignoreDuplicates: true}
    );

    if (!error) {
      queued += 1;
    }
  }

  return {queued, windowDays};
}

export async function queueLoanReminder(loanId: string) {
  const supabase = createAdminClient();

  const {data: loan, error} = await supabase
    .from('loans')
    .select(
      'id,loan_number,disbursement_date,duration_months,overdue_amount,outstanding_balance,repayment_frequency,members(id,full_name,phone)'
    )
    .eq('id', loanId)
    .single();

  if (error || !loan) {
    throw new Error('Loan not found');
  }

  const member = pickOne((loan as CandidateLoan).members);
  if (!member || !member.phone) {
    throw new Error('Loan member has no phone number');
  }
  if ((loan as CandidateLoan).repayment_frequency === 'daily') {
    throw new Error('Daily repayment loans are excluded from SMS reminders');
  }

  const daysOverdue = Math.max(
    (loan as CandidateLoan).overdue_amount > 0 ? 1 : 0,
    calculateDaysOverdue(loan.disbursement_date, loan.duration_months)
  );

  if (daysOverdue <= 0) {
    throw new Error('Loan is not overdue');
  }

  const templates = await getTemplates('repayment_overdue');
  const template = templates.get('sw') ?? templates.get('en');
  if (!template) {
    throw new Error('No repayment_overdue template found');
  }

  const message = interpolateTemplate(template, {
    member_name: member.full_name,
    loan_number: loan.loan_number,
    overdue_amount: Number(loan.overdue_amount).toLocaleString(),
    days_overdue: daysOverdue,
    company_name: 'Viva Brightlife'
  });

  const {error: upsertError} = await supabase.from('sms_reminders').upsert(
    {
      loan_id: loan.id,
      member_id: member.id,
      reminder_key: `manual_overdue_${new Date().toISOString().slice(0, 10)}`,
      phone: member.phone,
      message,
      days_overdue: daysOverdue,
      scheduled_for: new Date().toISOString(),
      status: 'queued',
      delivery_status: 'queued',
      provider_name: process.env.SMS_PROVIDER ?? 'mock'
    },
    {onConflict: 'loan_id,reminder_key'}
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return {queued: 1};
}
