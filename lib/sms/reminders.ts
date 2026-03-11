import {createAdminClient} from '@/lib/supabase/admin';
import {sendSms} from './provider';

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

async function getTemplates() {
  const supabase = createAdminClient();
  const {data, error} = await supabase
    .from('sms_templates')
    .select('language,body')
    .eq('template_key', 'repayment_overdue')
    .eq('is_active', true);

  if (error || !data) {
    return new Map<string, string>();
  }

  return new Map((data as TemplateRow[]).map((row) => [row.language, row.body]));
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
        'id,loan_number,disbursement_date,duration_months,overdue_amount,outstanding_balance,members(id,full_name,phone)'
      )
      .eq('status', 'active')
      .gt('outstanding_balance', 0),
    getTemplates()
  ]);

  const rules = (rulesData ?? []) as ReminderRule[];
  const loans = (loansData ?? []) as CandidateLoan[];

  const memberIds = loans
    .map((loan) => pickOne(loan.members)?.id)
    .filter((id): id is string => Boolean(id));

  const preferences = await getPreferences(memberIds);

  let queued = 0;

  for (const loan of loans) {
    const member = pickOne(loan.members);
    if (!member || !member.phone) {
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
          status: 'queued',
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

export async function queueLoanReminder(loanId: string) {
  const supabase = createAdminClient();

  const {data: loan, error} = await supabase
    .from('loans')
    .select(
      'id,loan_number,disbursement_date,duration_months,overdue_amount,outstanding_balance,members(id,full_name,phone)'
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

  const daysOverdue = Math.max(
    (loan as CandidateLoan).overdue_amount > 0 ? 1 : 0,
    calculateDaysOverdue(loan.disbursement_date, loan.duration_months)
  );

  if (daysOverdue <= 0) {
    throw new Error('Loan is not overdue');
  }

  const templates = await getTemplates();
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