'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';

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
    .select('loan_id, paid_amount, expected_amount')
    .eq('id', scheduleId)
    .single();

  if (fetchError || !existing) {
    return { error: fetchError?.message || 'Schedule not found' };
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
