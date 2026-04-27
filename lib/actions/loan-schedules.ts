'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {
  addDaysToDateOnly,
  addMonthsToDateOnly,
  formatDateOnlyFromUtc,
  toUtcDate
} from '@/lib/date-only';
import {checkAndExtendLoanIfOverdue} from './loan-utils';

const getDefaultReturnStartDate = (
  disbursementDate: string,
  repaymentFrequency: string
) =>
  repaymentFrequency === 'monthly'
    ? addMonthsToDateOnly(disbursementDate, 1)
    : addDaysToDateOnly(disbursementDate, repaymentFrequency === 'daily' ? 1 : 7);

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

  const schedules: Array<{
    loan_id: string;
    week_number: number;
    expected_date: string;
    expected_amount: number;
    status: string;
  }> = [];
  let remainingAmount = outstandingBalance;
  const start = toUtcDate(startDate) ?? toUtcDate(disbursementDate);
  if (!start) {
    return schedules;
  }
  let currentDate = new Date(start);
  const isDaily = repaymentFrequency === 'daily';

  for (let i = 1; i <= durationWeeks; i++) {
    if (i > 1) {
      currentDate.setUTCDate(currentDate.getUTCDate() + (isDaily ? 1 : 7));
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
      expected_date: formatDateOnlyFromUtc(currentDate),
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
    .select('loan_type, disbursement_date, duration_months, weekly_installment, status, return_start_date')
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

  const monthlyInstallment = totalRepay / durationMonths;
  const schedules = [];

  const firstReturnDate =
    loanRow.return_start_date && loanRow.return_start_date.trim()
      ? loanRow.return_start_date
      : addMonthsToDateOnly(loanRow.disbursement_date, 1);

  for (let month = 1; month <= durationMonths; month++) {
    const expectedDate =
      month === 1
        ? firstReturnDate
        : addMonthsToDateOnly(firstReturnDate ?? loanRow.disbursement_date, month - 1);

    if (!expectedDate) {
      continue;
    }
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

  if (loanRow.loan_type === 'binafsi' && loanRow.status === 'active') {
    await checkAndExtendLoanIfOverdue(loanId);
    
    // Re-fetch to get any newly created schedules
    const {data: refreshed, error: refreshError} = await supabase
      .from('loan_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .order('week_number', {ascending: true});
      
    if (refreshError || !refreshed) {
      return data;
    }
    return refreshed;
  }

  return freshSchedules || data;
}

export async function updateScheduleStatusAction(
  scheduleId: string,
  newStatus: string,
  paymentAmount?: number
) {
  try {
    const supabase = createClient();
    
    // 1. Get current schedule and loan info
    const {data: existing, error: fetchErr} = await supabase
      .from('loan_schedules')
      .select('*, loans!inner(id, outstanding_balance, status, loan_type, amount_withdrawn)')
      .eq('id', scheduleId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Schedule not found');
    }

    const rawLoans = existing.loans as any;
    const loanRow = Array.isArray(rawLoans) ? rawLoans[0] : rawLoans;
    
    if (!loanRow) {
      throw new Error('Associated loan not found');
    }

    const currentPaidScroll = Number(existing.paid_amount ?? 0);
    
    // If paymentAmount is provided, we use it. Otherwise assume full expected amount.
    const targetPaid = paymentAmount !== undefined ? paymentAmount : Number(existing.expected_amount ?? 0);
    const delta = targetPaid - currentPaidScroll;

    // 2. Update Schedule
    const {error: updateErr} = await supabase
      .from('loan_schedules')
      .update({
        status: newStatus,
        paid_amount: targetPaid,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (updateErr) throw updateErr;

    // 3. Record Transaction
    if (delta !== 0) {
      await supabase.from('loan_transactions').insert({
        loan_id: existing.loan_id,
        schedule_id: scheduleId,
        amount: Math.abs(delta),
        transaction_date: new Date().toISOString().split('T')[0],
        type: delta > 0 ? 'payment' : 'reversal',
        notes: delta > 0 
          ? `Payment for period ${existing.week_number} (${targetPaid === existing.expected_amount ? 'Full' : 'Partial'})` 
          : 'Payment reversed'
      });

      // 4. Update Loan Balance and Total Paid
      const currentOutstanding = Number(loanRow.outstanding_balance ?? 0);
      const newOutstanding = Math.max(0, currentOutstanding - delta);
      
      const currentTotalPaid = Number(loanRow.amount_withdrawn ?? 0);
      const newTotalPaid = currentTotalPaid + delta;

      const updatePayload: any = { 
        outstanding_balance: newOutstanding,
        amount_withdrawn: newTotalPaid
      };
      
      // Auto-close if fully paid
      if (newOutstanding <= 0) {
        updatePayload.status = 'closed';
      } else if (loanRow.status === 'closed' && newOutstanding > 0) {
        updatePayload.status = 'active'; // Re-open if reversal happens
      }

      await supabase
        .from('loans')
        .update(updatePayload)
        .eq('id', existing.loan_id);

      if (loanRow.loan_type === 'binafsi') {
        const { data: futureSchedules } = await supabase
          .from('loan_schedules')
          .select('id, expected_amount')
          .eq('loan_id', existing.loan_id)
          .gt('week_number', existing.week_number);

        if (futureSchedules && futureSchedules.length > 0) {
          for (const sched of futureSchedules) {
            const newExpected = Math.max(0, Number(sched.expected_amount) - delta);
            await supabase
              .from('loan_schedules')
              .update({ expected_amount: newExpected })
              .eq('id', sched.id);
          }
        }
      }
    }

    revalidatePath('/', 'layout');
    return {success: true};
  } catch (error: any) {
    return {success: false, error: error.message || 'Failed to update status'};
  }
}

export async function regenerateLoanSchedulesAction(loanId: string) {
  try {
    const supabase = createClient();
    const {data: loanRow, error: loanError} = await supabase
      .from('loans')
      .select(
        'id,loan_type,disbursement_date,repayment_frequency,cycle_count,weekly_installment,outstanding_balance,return_start_date,duration_months'
      )
      .eq('id', loanId)
      .single();

    if (loanError || !loanRow) {
      return {error: loanError?.message || 'Loan not found'};
    }

    // Logic for binafsi is now supported below

    const isBinafsi = loanRow.loan_type === 'binafsi';
    const durationWeeks = isBinafsi
      ? (loanRow.duration_months || 1)
      : (Number(loanRow.cycle_count ?? 0) || 1);

    let schedules: any[] = [];
    if (isBinafsi) {
      const durationMonths = durationWeeks;
      const totalRepay = Number(loanRow.weekly_installment ?? 0);
      const monthlyInstallment = totalRepay / durationMonths;
      const firstReturnDate =
        loanRow.return_start_date && loanRow.return_start_date.trim()
          ? loanRow.return_start_date
          : addMonthsToDateOnly(loanRow.disbursement_date, 1);

      for (let month = 1; month <= durationMonths; month++) {
        const expectedDate =
          month === 1
            ? firstReturnDate
            : addMonthsToDateOnly(firstReturnDate ?? loanRow.disbursement_date, month - 1);

        if (!expectedDate) continue;

        schedules.push({
          loan_id: loanId,
          week_number: month,
          expected_date: expectedDate,
          expected_amount: monthlyInstallment,
          status: 'pending'
        });
      }
    } else {
      schedules = buildWeeklySchedules({
        loanId,
        disbursementDate: loanRow.disbursement_date,
        returnStartDate: loanRow.return_start_date,
        repaymentFrequency: loanRow.repayment_frequency ?? 'weekly',
        durationWeeks,
        installmentSize: Number(loanRow.weekly_installment ?? 0),
        outstandingBalance: Number(loanRow.outstanding_balance ?? 0)
      });
    }

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
  } catch (err: any) {
    console.error('Regeneration failed:', err);
    return {error: err.message || 'An unexpected error occurred during regeneration.'};
  }
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

export async function markGroupSchedulesPaidAction(
  groupId: string,
  expectedDate: string
) {
  const supabase = createClient();
  if (!groupId) {
    return {error: 'Group is required.'};
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) {
    return {error: 'Invalid date format.'};
  }

  const {data: schedules, error} = await supabase
    .from('loan_schedules')
    .select(
      'id,loan_id,week_number,expected_amount,paid_amount,status,loans!inner(id,group_id,outstanding_balance,status,amount_withdrawn)'
    )
    .eq('expected_date', expectedDate)
    .eq('loans.group_id', groupId);

  if (error || !schedules) {
    return {error: error?.message || 'Failed to load schedules'};
  }

  let updated = 0;
  let skippedPaid = 0;
  let skippedPrev = 0;
  let skippedInactive = 0;
  const errors: string[] = [];

  const pickSingle = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : value ?? null;

  for (const row of schedules as Array<{
    id: string;
    loan_id: string;
    week_number: number;
    expected_amount: number;
    paid_amount: number | null;
    status: string;
    loans:
      | {id: string; group_id: string; outstanding_balance: number; status: string; amount_withdrawn?: number}
      | {id: string; group_id: string; outstanding_balance: number; status: string; amount_withdrawn?: number}[]
      | null;
  }>) {
    const loanRow = pickSingle(row.loans);
    if (!loanRow || loanRow.status !== 'active') {
      skippedInactive += 1;
      continue;
    }
    if (row.status === 'paid') {
      skippedPaid += 1;
      continue;
    }

    const {data: previous, error: prevError} = await supabase
      .from('loan_schedules')
      .select('id,status')
      .eq('loan_id', row.loan_id)
      .lt('week_number', row.week_number)
      .order('week_number', {ascending: false})
      .limit(1)
      .maybeSingle();

    if (prevError) {
      errors.push(prevError.message);
      continue;
    }

    if (previous && previous.status !== 'paid') {
      skippedPrev += 1;
      continue;
    }

    const expectedAmount = Number(row.expected_amount ?? 0);
    const oldPaid = Number(row.paid_amount ?? 0);
    const newPaidAmount = expectedAmount;

    const {error: updateError} = await supabase
      .from('loan_schedules')
      .update({status: 'paid', paid_amount: newPaidAmount})
      .eq('id', row.id);

    if (updateError) {
      errors.push(updateError.message);
      continue;
    }

    const delta = newPaidAmount - oldPaid;
    if (delta !== 0) {
      const currentOutstanding = Number(loanRow.outstanding_balance ?? 0);
      const newOutstanding = currentOutstanding - delta;
      
      const currentTotalPaid = Number(loanRow.amount_withdrawn ?? 0);
      const newTotalPaid = currentTotalPaid + delta;

      const {error: updateLoanError} = await supabase
        .from('loans')
        .update({
          outstanding_balance: newOutstanding,
          amount_withdrawn: newTotalPaid
        })
        .eq('id', row.loan_id);

      if (updateLoanError) {
        errors.push(updateLoanError.message);
        continue;
      }
    }

    updated += 1;
  }

  revalidatePath('/', 'layout');
  return {
    success: true,
    updated,
    skippedPaid,
    skippedPrev,
    skippedInactive,
    errors
  };
}
