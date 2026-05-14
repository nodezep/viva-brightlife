'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {addMonthsToDateOnly, addDaysToDateOnly} from '@/lib/date-only';

function getTodayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function checkAndExtendLoanIfOverdue(loanId: string) {
  const supabase = createClient();
  
  // 1. Fetch loan and its schedules
  const {data: loan, error: loanErr} = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (loanErr || !loan || loan.loan_type !== 'binafsi' || loan.status !== 'active') {
    return;
  }

  const {data: schedules, error: schedErr} = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('loan_id', loanId)
    .order('week_number', {ascending: true});

  if (schedErr || !schedules || schedules.length === 0) {
    return;
  }

    const today = getTodayIsoLocal();
    let latestDate = schedules[schedules.length - 1].expected_date;
    const lastIsUnpaid = schedules[schedules.length - 1].status !== 'paid';

    if (latestDate && latestDate < today && lastIsUnpaid) {
      const repaymentFrequency = loan.repayment_frequency || 'monthly';
      const newSchedules = [];
      let addedPeriods = 0;
      const principal = Number(loan.principal_amount || 0);
      const rate = Number(loan.interest_rate || 0);

      // Interest logic remains monthly, so we adjust the rate per period
      let periodInterest = (principal * rate) / 100;
      if (repaymentFrequency === 'weekly') {
        periodInterest = periodInterest / 4;
      } else if (repaymentFrequency === 'daily') {
        periodInterest = periodInterest / 30;
      }

      let currentBalance = Number(loan.outstanding_balance || 0);
      let cursorDate = latestDate;
      while (cursorDate < today) {
        addedPeriods++;
        const nextDate = repaymentFrequency === 'monthly'
          ? addMonthsToDateOnly(cursorDate, 1)
          : addDaysToDateOnly(cursorDate, repaymentFrequency === 'daily' ? 1 : 7);

        if (!nextDate) break;
        cursorDate = nextDate;

        currentBalance += periodInterest;

        newSchedules.push({
          loan_id: loanId,
          week_number: schedules.length + addedPeriods,
          expected_date: nextDate,
          expected_amount: currentBalance,
          status: 'overdue'
        });
      }

      if (newSchedules.length > 0) {
        const totalAddedInterest = periodInterest * addedPeriods;

        // Update Loan via Atomic RPC
        const {error: rpcError} = await supabase.rpc('adjust_loan_balance_and_terms', {
          p_loan_id: loanId,
          p_interest_delta: totalAddedInterest,
          p_cycle_delta: addedPeriods
        });

      if (rpcError) {
        console.error('Failed to adjust loan balance:', rpcError);
        return;
      }

      // Insert New Schedules
      await supabase.from('loan_schedules').insert(newSchedules);
      
      revalidatePath('/', 'layout');
    }
  }
}
