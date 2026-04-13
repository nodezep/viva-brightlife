'use server';

import {createClient} from '@/lib/supabase/server';
import type {LoanStatus} from '@/types';

export type LoanTransaction = {
  id: string;
  loan_id: string;
  amount: number;
  transaction_date: string;
  type: 'payment' | 'reversal' | 'interest_accrual';
  notes: string | null;
  created_at: string;
};

export async function getLoanTransactions(loanId: string): Promise<LoanTransaction[]> {
  const supabase = createClient();
  const {data, error} = await supabase
    .from('loan_transactions')
    .select('*')
    .eq('loan_id', loanId)
    .order('created_at', {ascending: false});

  if (error || !data) {
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    loan_id: t.loan_id,
    amount: Number(t.amount ?? 0),
    transaction_date: t.transaction_date,
    type: t.type,
    notes: t.notes,
    created_at: t.created_at
  }));
}
