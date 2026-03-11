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

  return data;
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
