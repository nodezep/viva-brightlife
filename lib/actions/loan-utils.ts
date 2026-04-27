'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {addMonthsToDateOnly} from '@/lib/date-only';

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
    const newSchedules = [];
    let addedMonths = 0;
    const principal = Number(loan.principal_amount || 0);
    const rate = Number(loan.interest_rate || 0);
    const monthlyInterest = (principal * rate) / 100;
    
    let currentBalance = Number(loan.outstanding_balance || 0);
    let cursorDate = latestDate;
    while (cursorDate < today) {
      addedMonths++;
      const nextDate = addMonthsToDateOnly(cursorDate, 1);
      if (!nextDate) break;
      cursorDate = nextDate;
      
      currentBalance += monthlyInterest;

      newSchedules.push({
        loan_id: loanId,
        week_number: schedules.length + addedMonths,
        expected_date: nextDate,
        expected_amount: currentBalance,
        status: 'overdue'
      });
    }

    if (newSchedules.length > 0) {
      const addedInterest = monthlyInterest * addedMonths;

      const newSecurity = Number(loan.security_amount || 0) + addedInterest;
      const newBalance = Number(loan.outstanding_balance || 0) + addedInterest;
      const newCycle = Number(loan.cycle_count || 0) + addedMonths;
      const newDuration = Number(loan.duration_months || 0) + addedMonths;

      // Update Loan
      await supabase
        .from('loans')
        .update({
          security_amount: newSecurity,
          outstanding_balance: newBalance,
          cycle_count: newCycle,
          duration_months: newDuration
        })
        .eq('id', loanId);

      // Insert New Schedules
      await supabase.from('loan_schedules').insert(newSchedules);
      
      revalidatePath('/', 'layout');
    }
  }
}
