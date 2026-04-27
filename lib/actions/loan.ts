'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {
  addDaysToDateOnly,
  addMonthsToDateOnly,
  formatDateOnlyFromUtc,
  toUtcDate
} from '@/lib/date-only';

const getDefaultReturnStartDate = (
  disbursementDate: string,
  repaymentFrequency: string
) =>
  repaymentFrequency === 'monthly'
    ? addMonthsToDateOnly(disbursementDate, 1)
    : addDaysToDateOnly(disbursementDate, repaymentFrequency === 'daily' ? 1 : 7);

const computeDurationPeriods = (total: number, installment: number) => {
  if (total <= 0 || installment <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(total / installment));
};

export async function createLoanAction(formData: FormData) {
  const supabase = createClient();
  
  const memberIdFromForm = formData.get('memberId') as string | null;
  const groupId = formData.get('groupId') as string | null;
  const memberNumber = formData.get('memberNumber') as string;
  const memberName = formData.get('memberName') as string;
  const loanNumber = formData.get('loanNumber') as string;
  const loanType = formData.get('loanType') as string;
  const principalAmount = Number(formData.get('disbursementAmount'));
  const disbursementDate = formData.get('disbursementDate') as string;
  let securityAmount = Number(formData.get('securityAmount') || 0);
  const interestRate = Number(formData.get('interestRate') || 0);
  const cycleCount = Number(formData.get('cycle') || 1);
  let installmentSize = Number(formData.get('installmentSize') || 0);
  let outstandingBalance = Number(formData.get('outstandingBalance') || 0);
  const overdueAmount = Number(formData.get('overdueAmount') || 0);
  const amountPaid = Number(formData.get('amountPaid') || 0);
  const memberPhone = formData.get('memberPhone') as string | null;
  const daysOverdue = Number(formData.get('daysOverdue') || 0);
  const repaymentFrequency =
    (formData.get('repaymentFrequency') as string | null) ?? 'weekly';
  const returnStartDateRaw = (formData.get('returnStartDate') as string | null) ?? '';
  const durationWeeksRaw = formData.get('durationWeeks');
  let durationWeeks =
    durationWeeksRaw === null || durationWeeksRaw === ''
      ? 0
      : Number(durationWeeksRaw);
  const durationMonths = Number(formData.get('durationMonths') || 0);

  if (loanType !== 'binafsi') {
    durationWeeks = computeDurationPeriods(outstandingBalance, installmentSize);
    if (durationWeeks <= 0) {
      return {
        error:
          'Please enter installment size and total repayment so the schedule can be calculated.'
      };
    }
  }

  let interestRatePercent = interestRate;
  if (loanType === 'binafsi') {
    const interestRateDecimal = interestRate / 100;
    interestRatePercent = interestRate;
    securityAmount = principalAmount * interestRateDecimal * Math.max(1, durationMonths);
    installmentSize = principalAmount + securityAmount;
    outstandingBalance = Math.max(installmentSize - amountPaid, 0);
  }
  
  // Custom desc build
  let itemDescription = '';
  if (loanType === 'electronics') {
    const productName = (formData.get('itemDescription') as string | null)?.trim();
    if (productName) {
      itemDescription = productName;
    } else {
      itemDescription = [
        formData.get('itemType'),
        formData.get('brandModel'),
        formData.get('warrantyPeriod')
      ].filter(Boolean).join(' | ');
    }
  } else if (loanType === 'kilimo') {
    itemDescription = [
      formData.get('cropType'),
      formData.get('farmSizeAcres') ? `${formData.get('farmSizeAcres')} acres` : '',
      formData.get('season')
    ].filter(Boolean).join(' | ');
  } else if (loanType === 'vyombo_moto') {
    itemDescription = [
      formData.get('vehicleType'),
      formData.get('brandModel'),
      formData.get('registrationNumber'),
      formData.get('yearOfManufacture')
    ].filter(Boolean).join(' | ');
  }

  // Enforce admission book for group loans
  if (loanType === 'vikundi_wakinamama' && memberIdFromForm) {
    const {data: admissionRow} = await supabase
      .from('admission_books')
      .select('has_book')
      .eq('member_id', memberIdFromForm)
      .maybeSingle();

    if (!admissionRow?.has_book) {
      return { error: 'Member is not approved in the admission book.' };
    }
  }

  // Find or create member matching memberNumber (or use provided memberId)
  let memberId = '';
  if (memberIdFromForm) {
    memberId = memberIdFromForm;
  } else {
    const {data: existingMember} = await supabase
      .from('members')
      .select('id')
      .eq('member_number', memberNumber)
      .single();

    if (existingMember) {
      memberId = existingMember.id;
      const updatePayload: Record<string, unknown> = {
        full_name: memberName
      };
      if (memberPhone?.trim()) {
        updatePayload.phone = memberPhone.trim();
      }
      await supabase.from('members').update(updatePayload).eq('id', memberId);
    } else {
      const {data: newMember, error: memberError} = await supabase
        .from('members')
        .insert({
          member_number: memberNumber,
          full_name: memberName,
          phone: memberPhone?.trim() ? memberPhone.trim() : null
        })
        .select('id')
        .single();
        
      if (memberError || !newMember) {
        return { error: 'Failed to create member: ' + memberError.message };
      }
      memberId = newMember.id;
    }
  }

  const resolvedCycleCount = loanType === 'binafsi' ? cycleCount : durationWeeks;

  const insertPayload: Record<string, unknown> = {
    member_id: memberId,
    group_id: groupId || null,
    loan_number: loanNumber,
    loan_type: loanType,
    principal_amount: principalAmount,
    disbursement_date: disbursementDate,
    security_amount: securityAmount,
    cycle_count: resolvedCycleCount,
    weekly_installment: installmentSize,
    monthly_installment: 0,
    amount_withdrawn: 0,
    outstanding_balance: outstandingBalance,
    overdue_amount: overdueAmount,
    status: 'active',
    item_description: itemDescription || null
  };

  if (loanType === 'binafsi') {
    insertPayload.duration_months = durationMonths;
    insertPayload.amount_withdrawn = amountPaid;
    insertPayload.interest_rate = interestRatePercent;
    insertPayload.days_overdue = daysOverdue;
    insertPayload.repayment_frequency = 'monthly';
  } else {
    insertPayload.repayment_frequency = repaymentFrequency;
  }

  const defaultReturnStart = loanType === 'binafsi' 
    ? addMonthsToDateOnly(disbursementDate, 1)
    : getDefaultReturnStartDate(disbursementDate, repaymentFrequency);

  insertPayload.return_start_date =
    returnStartDateRaw && returnStartDateRaw.trim()
      ? returnStartDateRaw
      : defaultReturnStart;

  const {data, error} = await supabase.from('loans').insert(insertPayload).select('id').single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create loan' };
  }

  const loanId = data.id;

  // Create schedules (Marejesho) automatically
  if (loanType !== 'binafsi' && durationWeeks > 0) {
    const schedules = [];
    let remainingAmount = outstandingBalance;
    const defaultReturnStart = getDefaultReturnStartDate(
      disbursementDate,
      repaymentFrequency
    );
    const startDate =
      returnStartDateRaw && returnStartDateRaw.trim()
        ? returnStartDateRaw
        : defaultReturnStart || disbursementDate;
    const start = toUtcDate(startDate) ?? toUtcDate(disbursementDate);
    if (!start) {
      revalidatePath('/', 'layout');
      return { success: true };
    }
    let currentDate = new Date(start);
    const isDaily = repaymentFrequency === 'daily';
    const isMonthly = repaymentFrequency === 'monthly';

    for (let i = 1; i <= durationWeeks; i++) {
      if (i > 1) {
        if (isMonthly) {
          const next = addMonthsToDateOnly(formatDateOnlyFromUtc(currentDate), 1);
          if (next) {
            currentDate = toUtcDate(next) ?? currentDate;
          }
        } else {
          currentDate.setUTCDate(currentDate.getUTCDate() + (isDaily ? 1 : 7));
        }
      }
      
      const isLastWeek = i === durationWeeks;
      // If it's the last week, pay all remaining. Otherwise math.min
      let expectedAmount = isLastWeek ? remainingAmount : Math.min(installmentSize, remainingAmount);
      
      // Prevent negative expected amounts just in case
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

    if (schedules.length > 0) {
      const { error: scheduleError } = await supabase.from('loan_schedules').insert(schedules);
      if (scheduleError) {
        console.error('Failed to create loan schedules:', scheduleError);
      }
    }
  } else if (loanType === 'binafsi' && durationMonths > 0) {
    // Generate monthly schedules - one entry per month
    const schedules = [];
    // Calculate monthly installment (total repayment divided by months)
    const monthlyInstallment = installmentSize / durationMonths;

    const firstReturnDate =
      returnStartDateRaw && returnStartDateRaw.trim()
        ? returnStartDateRaw
        : addMonthsToDateOnly(disbursementDate, 1);

    for (let month = 1; month <= durationMonths; month++) {
      const expectedDate =
        month === 1
          ? firstReturnDate
          : addMonthsToDateOnly(firstReturnDate ?? disbursementDate, month - 1);

      if (!expectedDate) {
        continue;
      }

      const expectedAmount = monthlyInstallment;

      schedules.push({
        loan_id: loanId,
        week_number: month,
        expected_date: expectedDate,
        expected_amount: expectedAmount,
        status: 'pending'
      });
    }

    if (schedules.length > 0) {
      const { error: scheduleError } = await supabase.from('loan_schedules').insert(schedules);

      if (scheduleError) {
        console.error('Failed to create loan schedules:', scheduleError);
      }
    }
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function deleteLoanAction(loanId: string) {
  const supabase = createClient();
  const {error} = await supabase.from('loans').delete().eq('id', loanId);
  
  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateLoanAction(formData: FormData) {
  const supabase = createClient();

  const loanId = formData.get('loanId') as string;
  const memberNumber = formData.get('memberNumber') as string;
  const memberName = formData.get('memberName') as string;
  const loanNumber = formData.get('loanNumber') as string;
  const principalAmount = Number(formData.get('disbursementAmount'));
  const disbursementDate = formData.get('disbursementDate') as string;
  let securityAmount = Number(formData.get('securityAmount') || 0);
  const interestRate = Number(formData.get('interestRate') || 0);
  const cycleCount = Number(formData.get('cycle') || 1);
  let installmentSize = Number(formData.get('installmentSize') || 0);
  let outstandingBalance = Number(formData.get('outstandingBalance') || 0);
  const overdueAmount = Number(formData.get('overdueAmount') || 0);
  const amountPaid = Number(formData.get('amountPaid') || 0);
  const memberPhone = formData.get('memberPhone') as string | null;
  const daysOverdue = Number(formData.get('daysOverdue') || 0);
  const itemDescription = (formData.get('itemDescription') as string | null) ?? '';
  const repaymentFrequency = (formData.get('repaymentFrequency') as string | null) ?? 'weekly';
  const returnStartDateRaw = (formData.get('returnStartDate') as string | null) ?? '';
  const durationWeeksRaw = formData.get('durationWeeks');
  let durationWeeks =
    durationWeeksRaw === null || durationWeeksRaw === ''
      ? 0
      : Number(durationWeeksRaw);
  const durationMonths = Number(formData.get('durationMonths') || 0);

  const {data: loanRow, error: loanError} = await supabase
    .from('loans')
    .select('member_id, loan_type')
    .eq('id', loanId)
    .single();

  if (loanError || !loanRow) {
    return {error: loanError?.message || 'Loan not found'};
  }

  const memberId = loanRow.member_id as string;
  const loanType = loanRow.loan_type as string;

  if (loanType !== 'binafsi') {
    durationWeeks = computeDurationPeriods(outstandingBalance, installmentSize);
    if (durationWeeks <= 0) {
      return {
        error:
          'Please enter installment size and total repayment so the schedule can be calculated.'
      };
    }
  }

  let interestRatePercent = interestRate;
  if (loanType === 'binafsi') {
    const interestRateDecimal = interestRate / 100;
    interestRatePercent = interestRate;
    securityAmount = principalAmount * interestRateDecimal * Math.max(1, durationMonths);
    installmentSize = principalAmount + securityAmount;
    outstandingBalance = Math.max(installmentSize - amountPaid, 0);
  }
  const memberPayload: Record<string, unknown> = {
    member_number: memberNumber,
    full_name: memberName
  };

  if (memberPhone?.trim()) {
    memberPayload.phone = memberPhone.trim();
  }

  const {error: memberError} = await supabase
    .from('members')
    .update(memberPayload)
    .eq('id', memberId);

  if (memberError) {
    return {error: memberError.message};
  }

  const resolvedCycleCount = loanType === 'binafsi' ? cycleCount : durationWeeks;

  const updatePayload: Record<string, unknown> = {
    loan_number: loanNumber,
    principal_amount: principalAmount,
    disbursement_date: disbursementDate,
    security_amount: securityAmount,
    cycle_count: resolvedCycleCount,
    weekly_installment: installmentSize,
    outstanding_balance: outstandingBalance,
    overdue_amount: overdueAmount
  };

  if (loanType === 'binafsi') {
    updatePayload.duration_months = durationMonths;
    updatePayload.amount_withdrawn = amountPaid;
    updatePayload.interest_rate = interestRatePercent;
    updatePayload.days_overdue = daysOverdue;
    updatePayload.repayment_frequency = 'monthly';
  } else {
    updatePayload.repayment_frequency = repaymentFrequency;
  }

  const defaultReturnStart = loanType === 'binafsi'
    ? addMonthsToDateOnly(disbursementDate, 1)
    : getDefaultReturnStartDate(disbursementDate, repaymentFrequency);

  updatePayload.return_start_date =
    returnStartDateRaw && returnStartDateRaw.trim()
      ? returnStartDateRaw
      : defaultReturnStart;
  
  if (loanType === 'electronics') {
    updatePayload.item_description = itemDescription.trim() || null;
  }

  const {error: updateError} = await supabase.from('loans').update(updatePayload).eq('id', loanId);

  if (updateError) {
    return {error: updateError.message};
  }

  const durationWeeksValue =
    loanType === 'binafsi'
      ? cycleCount
      : computeDurationPeriods(outstandingBalance, installmentSize);

  if (loanType !== 'binafsi' && durationWeeksValue > 0) {
    const {error: deleteError} = await supabase
      .from('loan_schedules')
      .delete()
      .eq('loan_id', loanId);

    if (deleteError) {
      return {error: deleteError.message};
    }

    const schedules = [];
    let remainingAmount = outstandingBalance;
    const defaultReturnStart = getDefaultReturnStartDate(
      disbursementDate,
      repaymentFrequency
    );
    const startDate =
      returnStartDateRaw && returnStartDateRaw.trim()
        ? returnStartDateRaw
        : defaultReturnStart || disbursementDate;
    const start = toUtcDate(startDate) ?? toUtcDate(disbursementDate);
    if (!start) {
      revalidatePath('/', 'layout');
      return {success: true};
    }
    let currentDate = new Date(start);
    const isDaily = repaymentFrequency === 'daily';
    const isMonthly = repaymentFrequency === 'monthly';

    for (let i = 1; i <= durationWeeksValue; i++) {
      if (i > 1) {
        if (isMonthly) {
          const next = addMonthsToDateOnly(formatDateOnlyFromUtc(currentDate), 1);
          if (next) {
            currentDate = toUtcDate(next) ?? currentDate;
          }
        } else {
          currentDate.setUTCDate(currentDate.getUTCDate() + (isDaily ? 1 : 7));
        }
      }
      const isLastWeek = i === durationWeeksValue;
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

    if (schedules.length > 0) {
      const {error: scheduleError} = await supabase
        .from('loan_schedules')
        .insert(schedules);
      if (scheduleError) {
        return {error: scheduleError.message};
      }
    }
  } else if (loanType === 'binafsi' && durationMonths > 0) {
    const {error: deleteError} = await supabase
      .from('loan_schedules')
      .delete()
      .eq('loan_id', loanId);

    if (deleteError) {
      return {error: deleteError.message};
    }

    // Generate monthly schedules - one entry per month
    const schedules = [];
    // Calculate monthly installment (total repayment divided by months)
    const monthlyInstallment = installmentSize / durationMonths;

    const firstReturnDate =
      returnStartDateRaw && returnStartDateRaw.trim()
        ? returnStartDateRaw
        : addMonthsToDateOnly(disbursementDate, 1);

    for (let month = 1; month <= durationMonths; month++) {
      const expectedDate =
        month === 1
          ? firstReturnDate
          : addMonthsToDateOnly(firstReturnDate ?? disbursementDate, month - 1);

      if (!expectedDate) {
        continue;
      }

      const expectedAmount = monthlyInstallment;

      schedules.push({
        loan_id: loanId,
        week_number: month,
        expected_date: expectedDate,
        expected_amount: expectedAmount,
        status: 'pending'
      });
    }

    if (schedules.length > 0) {
      const {error: scheduleError} = await supabase
        .from('loan_schedules')
        .insert(schedules);

      if (scheduleError) {
        return {error: scheduleError.message};
      }
    }
  }

  revalidatePath('/', 'layout');
  return {success: true};
}
