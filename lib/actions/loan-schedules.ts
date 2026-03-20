'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';

const addDaysToIso = (isoDate: string, days: number) => {
  const base = new Date(isoDate);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
};

const getDefaultReturnStartDate = (
  disbursementDate: string,
  repaymentFrequency: string
) => addDaysToIso(disbursementDate, repaymentFrequency === 'daily' ? 1 : 7);

const buildWeeklySchedules = (params: {
  loanId: string;
  disbursementDate: string;
  returnStartDate?: string | null;
  repaymentFrequency: string;
  durationWeeks: number;
  installmentSize: number;
  outstandingBalance: number;
}) => {
  const {
    loanId,
    disbursementDate,
    returnStartDate,
    repaymentFrequency,
    durationWeeks,
    installmentSize,
    outstandingBalance
  } = params;

  const defaultStart = getDefaultReturnStartDate(disbursementDate, repaymentFrequency);
  const startDate =
    returnStartDate && returnStartDate.trim()
      ? returnStartDate
      : defaultStart || disbursementDate;

  const schedules = [];
  let remainingAmount = outstandingBalance;
  let currentDate = new Date(startDate);
  const isDaily = repaymentFrequency === 'daily';

  for (let i = 1; i <= durationWeeks; i++) {
    if (i > 1) {
      currentDate.setDate(currentDate.getDate() + (isDaily ? 1 : 7));
    }
    const isLastWeek = i === durationWeeks;
    let expectedAmount = isLastWeek
      ? remainingAmount
      : Math.min(installmentSize, remainingAmount);
    if (expectedAmount < 0) expectedAmount = 0;
    remainingAmount -= expectedAmount;
    schedules.push({
      loan_id: loanId,
      week_number: i,
      expected_date: currentDate.toISOString().split('T')[0],
      expected_amount: expectedAmount,
      status: 'pending'
    });
  }

  return schedules;
};

export async function getLoanSchedulesAction(loanId: string) {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('loan_id', loanId)
    .order('week_number', {ascending: true});

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    return data;
  }

  const {data: loanRow, error: loanError} = await supabase
    .from('loans')
    .select('loan_type, disbursement_date, duration_months, weekly_installment')
    .eq('id', loanId)
    .single();

  if (loanError || !loanRow) {
    return data;
  }

  if (loanRow.loan_type !== 'binafsi') {
    return data;
  }

  const durationMonths = Number(loanRow.duration_months ?? 0);
  if (durationMonths <= 0) {
    return data;
  }

  const totalRepay = Number(loanRow.weekly_installment ?? 0);
  if (totalRepay <= 0) {
    return data;
  }

  const addMonths = (date: Date, months: number) => {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return d;
  };

  const monthlyInstallment = totalRepay / durationMonths;
  const schedules = [];
  const disbursementDate = new Date(loanRow.disbursement_date);

  for (let month = 1; month <= durationMonths; month++) {
    const expectedDate = addMonths(disbursementDate, month)
      .toISOString()
      .split('T')[0];
    schedules.push({
      loan_id: loanId,
      week_number: month,
      expected_date: expectedDate,
      expected_amount: monthlyInstallment,
      status: 'pending'
    });
  }

  if (schedules.length > 0) {
    const {error: scheduleError} = await supabase
      .from('loan_schedules')
      .insert(schedules);
    if (scheduleError) {
      console.error('Failed to create loan schedules:', scheduleError);
      return data;
    }
  }

  const {data: freshSchedules, error: refreshError} = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('loan_id', loanId)
    .order('week_number', {ascending: true});

  if (refreshError) {
    return data;
  }

  return freshSchedules;
}

export async function updateScheduleStatusAction(scheduleId: string, status: string) {
  const supabase = createClient();
  const {data: existing, error: fetchError} = await supabase
    .from('loan_schedules')
    .select('loan_id, paid_amount, expected_amount, expected_date, week_number, status')
    .eq('id', scheduleId)
    .single();

  if (fetchError || !existing) {
    return { error: fetchError?.message || 'Schedule not found' };
  }

  if (status === 'paid') {
    const {data: previous, error: prevError} = await supabase
      .from('loan_schedules')
      .select('id, status')
      .eq('loan_id', existing.loan_id)
      .lt('week_number', existing.week_number)
      .order('week_number', {ascending: false})
      .limit(1)
      .maybeSingle();

    if (prevError) {
      return {error: prevError.message};
    }

    if (previous && previous.status !== 'paid') {
      return {error: 'Please mark the previous installment before this one.'};
    }
  }

  const newPaidAmount = status === 'paid' ? Number(existing.expected_amount ?? 0) : 0;

  const {error} = await supabase
    .from('loan_schedules')
    .update({status, paid_amount: newPaidAmount})
    .eq('id', scheduleId);

  if (error) {
    return { error: error.message };
  }

  const oldPaid = Number(existing.paid_amount ?? 0);
  const delta = newPaidAmount - oldPaid;

  if (delta !== 0) {
    const {data: loanRow, error: loanError} = await supabase
      .from('loans')
      .select('outstanding_balance')
      .eq('id', existing.loan_id)
      .single();

    if (loanError || !loanRow) {
      return { error: loanError?.message || 'Loan not found' };
    }

    const currentOutstanding = Number(loanRow.outstanding_balance ?? 0);
    const newOutstanding = currentOutstanding - delta;

    const {error: updateLoanError} = await supabase
      .from('loans')
      .update({outstanding_balance: newOutstanding})
      .eq('id', existing.loan_id);

    if (updateLoanError) {
      return { error: updateLoanError.message };
    }
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function regenerateLoanSchedulesAction(loanId: string) {
  const supabase = createClient();
  const {data: loanRow, error: loanError} = await supabase
    .from('loans')
    .select(
      'id,loan_type,disbursement_date,repayment_frequency,cycle_count,weekly_installment,outstanding_balance,return_start_date'
    )
    .eq('id', loanId)
    .single();

  if (loanError || !loanRow) {
    return {error: loanError?.message || 'Loan not found'};
  }

  if (loanRow.loan_type === 'binafsi') {
    return {error: 'Schedule regeneration not supported for binafsi here.'};
  }

  const durationWeeks = Number(loanRow.cycle_count ?? 0) || 1;
  const schedules = buildWeeklySchedules({
    loanId,
    disbursementDate: loanRow.disbursement_date,
    returnStartDate: loanRow.return_start_date,
    repaymentFrequency: loanRow.repayment_frequency ?? 'weekly',
    durationWeeks,
    installmentSize: Number(loanRow.weekly_installment ?? 0),
    outstandingBalance: Number(loanRow.outstanding_balance ?? 0)
  });

  const {error: deleteError} = await supabase
    .from('loan_schedules')
    .delete()
    .eq('loan_id', loanId);

  if (deleteError) {
    return {error: deleteError.message};
  }

  if (schedules.length > 0) {
    const {error: insertError} = await supabase
      .from('loan_schedules')
      .insert(schedules);
    if (insertError) {
      return {error: insertError.message};
    }
  }

  revalidatePath('/', 'layout');
  return {success: true};
}

export async function regenerateGroupSchedulesAction(groupId: string) {
  const supabase = createClient();
  const {data: loans, error} = await supabase
    .from('loans')
    .select(
      'id,loan_type,disbursement_date,repayment_frequency,cycle_count,weekly_installment,outstanding_balance,return_start_date'
    )
    .eq('group_id', groupId);

  if (error || !loans) {
    return {error: error?.message || 'Failed to load group loans'};
  }

  for (const loan of loans) {
    if (loan.loan_type === 'binafsi') {
      continue;
    }
    const durationWeeks = Number(loan.cycle_count ?? 0) || 1;
    const schedules = buildWeeklySchedules({
      loanId: loan.id,
      disbursementDate: loan.disbursement_date,
      returnStartDate: loan.return_start_date,
      repaymentFrequency: loan.repayment_frequency ?? 'weekly',
      durationWeeks,
      installmentSize: Number(loan.weekly_installment ?? 0),
      outstandingBalance: Number(loan.outstanding_balance ?? 0)
    });

    const {error: deleteError} = await supabase
      .from('loan_schedules')
      .delete()
      .eq('loan_id', loan.id);

    if (deleteError) {
      return {error: deleteError.message};
    }

    if (schedules.length > 0) {
      const {error: insertError} = await supabase
        .from('loan_schedules')
        .insert(schedules);
      if (insertError) {
        return {error: insertError.message};
      }
    }
  }

  revalidatePath('/', 'layout');
  return {success: true};
}
