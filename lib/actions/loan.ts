'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';

export async function createLoanAction(formData: FormData) {
  const supabase = createClient();
  
  const memberNumber = formData.get('memberNumber') as string;
  const memberName = formData.get('memberName') as string;
  const loanNumber = formData.get('loanNumber') as string;
  const loanType = formData.get('loanType') as string;
  const principalAmount = Number(formData.get('disbursementAmount'));
  const disbursementDate = formData.get('disbursementDate') as string;
  const securityAmount = Number(formData.get('securityAmount') || 0);
  const cycleCount = Number(formData.get('cycle') || 1);
  const installmentSize = Number(formData.get('installmentSize') || 0);
  const outstandingBalance = Number(formData.get('outstandingBalance') || 0);
  const overdueAmount = Number(formData.get('overdueAmount') || 0);
  const durationWeeks = Number(formData.get('durationWeeks') || 1);
  
  // Custom desc build
  let itemDescription = '';
  if (loanType === 'electronics') {
    itemDescription = [
      formData.get('itemType'),
      formData.get('brandModel'),
      formData.get('warrantyPeriod')
    ].filter(Boolean).join(' | ');
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

  // Find or create member matching memberNumber
  let memberId = '';
  const {data: existingMember} = await supabase
    .from('members')
    .select('id')
    .eq('member_number', memberNumber)
    .single();

  if (existingMember) {
    memberId = existingMember.id;
  } else {
    const {data: newMember, error: memberError} = await supabase
      .from('members')
      .insert({
        member_number: memberNumber,
        full_name: memberName
      })
      .select('id')
      .single();
      
    if (memberError || !newMember) {
      return { error: 'Failed to create member: ' + memberError.message };
    }
    memberId = newMember.id;
  }

  const {data, error} = await supabase.from('loans').insert({
    member_id: memberId,
    loan_number: loanNumber,
    loan_type: loanType,
    principal_amount: principalAmount,
    disbursement_date: disbursementDate,
    security_amount: securityAmount,
    cycle_count: cycleCount,
    weekly_installment: installmentSize,
    monthly_installment: 0,
    amount_withdrawn: 0,
    outstanding_balance: outstandingBalance,
    overdue_amount: overdueAmount,
    status: 'active',
    item_description: itemDescription || null
  }).select('id').single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create loan' };
  }

  const loanId = data.id;

  // Create weekly schedule (Marejesho) automatically
  if (durationWeeks > 0) {
    const schedules = [];
    let remainingAmount = outstandingBalance;
    let currentDate = new Date(disbursementDate);

    const addMonths = (date: Date, months: number) => {
      const d = new Date(date);
      const day = d.getDate();
      d.setMonth(d.getMonth() + months);
      if (d.getDate() < day) {
        d.setDate(0);
      }
      return d;
    };

    // One-month grace period before first weekly payment
    currentDate = addMonths(currentDate, 1);

    for (let i = 1; i <= durationWeeks; i++) {
      currentDate.setDate(currentDate.getDate() + 7);
      
      const isLastWeek = i === durationWeeks;
      // If it's the last week, pay all remaining. Otherwise math.min
      let expectedAmount = isLastWeek ? remainingAmount : Math.min(installmentSize, remainingAmount);
      
      // Prevent negative expected amounts just in case
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
  const securityAmount = Number(formData.get('securityAmount') || 0);
  const cycleCount = Number(formData.get('cycle') || 1);
  const installmentSize = Number(formData.get('installmentSize') || 0);
  const outstandingBalance = Number(formData.get('outstandingBalance') || 0);
  const overdueAmount = Number(formData.get('overdueAmount') || 0);
  const durationWeeks = Number(formData.get('durationWeeks') || 0);

  const {data: loanRow, error: loanError} = await supabase
    .from('loans')
    .select('member_id')
    .eq('id', loanId)
    .single();

  if (loanError || !loanRow) {
    return {error: loanError?.message || 'Loan not found'};
  }

  const memberId = loanRow.member_id as string;
  const {error: memberError} = await supabase
    .from('members')
    .update({member_number: memberNumber, full_name: memberName})
    .eq('id', memberId);

  if (memberError) {
    return {error: memberError.message};
  }

  const {error: updateError} = await supabase.from('loans').update({
    loan_number: loanNumber,
    principal_amount: principalAmount,
    disbursement_date: disbursementDate,
    security_amount: securityAmount,
    cycle_count: cycleCount,
    weekly_installment: installmentSize,
    outstanding_balance: outstandingBalance,
    overdue_amount: overdueAmount
  }).eq('id', loanId);

  if (updateError) {
    return {error: updateError.message};
  }

  if (durationWeeks > 0) {
    const {error: deleteError} = await supabase
      .from('loan_schedules')
      .delete()
      .eq('loan_id', loanId);

    if (deleteError) {
      return {error: deleteError.message};
    }

    const schedules = [];
    let remainingAmount = outstandingBalance;
    let currentDate = new Date(disbursementDate);

    const addMonths = (date: Date, months: number) => {
      const d = new Date(date);
      const day = d.getDate();
      d.setMonth(d.getMonth() + months);
      if (d.getDate() < day) {
        d.setDate(0);
      }
      return d;
    };

    // One-month grace period before first weekly payment
    currentDate = addMonths(currentDate, 1);

    for (let i = 1; i <= durationWeeks; i++) {
      currentDate.setDate(currentDate.getDate() + 7);
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
