'use server';

import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';

export async function createLoanAction(formData: FormData) {
  const supabase = createClient();
  
  const memberId = formData.get('memberId') as string;
  const loanNumber = formData.get('loanNumber') as string;
  const loanType = formData.get('loanType') as string;
  const principalAmount = Number(formData.get('disbursementAmount'));
  const disbursementDate = formData.get('disbursementDate') as string;
  const securityAmount = Number(formData.get('securityAmount') || 0);
  const cycleCount = Number(formData.get('cycle') || 1);
  const weeklyInstallment = Number(formData.get('weeklyInstallment') || 0);
  const monthlyInstallment = Number(formData.get('monthlyInstallment') || 0);
  const amountWithdrawn = Number(formData.get('amountWithdrawn') || 0);
  const outstandingBalance = Number(formData.get('outstandingBalance') || 0);
  const overdueAmount = Number(formData.get('overdueAmount') || 0);
  
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

  const {error} = await supabase.from('loans').insert({
    member_id: memberId,
    loan_number: loanNumber,
    loan_type: loanType,
    principal_amount: principalAmount,
    disbursement_date: disbursementDate,
    security_amount: securityAmount,
    cycle_count: cycleCount,
    weekly_installment: weeklyInstallment,
    monthly_installment: monthlyInstallment,
    amount_withdrawn: amountWithdrawn,
    outstanding_balance: outstandingBalance,
    overdue_amount: overdueAmount,
    status: 'active',
    item_description: itemDescription || null
  });

  if (error) {
    return { error: error.message };
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
