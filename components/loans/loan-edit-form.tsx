'use client';

import {useTransition, useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {updateLoanAction} from '@/lib/actions/loan';
import type {LoanRecord} from '@/types';

type Props = {
  loan: LoanRecord;
  onClose: () => void;
};

export function LoanEditForm({loan, onClose}: Props) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [totalRepay, setTotalRepay] = useState(String(loan.outstandingBalance ?? ''));
  const [durationWeeks, setDurationWeeks] = useState('');
  const [installment, setInstallment] = useState(String(loan.installmentSize ?? ''));

  useEffect(() => {
    const repayVal = Number(totalRepay);
    const weeksVal = Number(durationWeeks);
    if (repayVal > 0 && weeksVal > 0) {
      const perWeek = repayVal / weeksVal;
      const suggested = Math.ceil(perWeek / 100) * 100;
      setInstallment(suggested.toString());
    }
  }, [totalRepay, durationWeeks]);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await updateLoanAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <form
      className="no-print grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3"
      action={handleSubmit}
    >
      <input type="hidden" name="loanId" value={loan.id} />
      <input
        required
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.member_number') || 'Member Number'}
        name="memberNumber"
        defaultValue={loan.memberNumber}
      />
      <input
        required
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.member_name') || 'Member Name'}
        name="memberName"
        defaultValue={loan.memberName}
      />
      <input
        required
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.loan_number') || 'Loan Number'}
        name="loanNumber"
        defaultValue={loan.loanNumber}
      />
      <input
        required
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.disbursement_amount') || 'Disbursement Amount'}
        name="disbursementAmount"
        defaultValue={loan.disbursementAmount}
      />
      <input
        required
        type="date"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        name="disbursementDate"
        defaultValue={loan.disbursementDate}
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.security_amount') || 'Security Amount'}
        name="securityAmount"
        defaultValue={loan.securityAmount}
      />
      <input
        required
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.cycle') || 'Cycle'}
        name="cycle"
        defaultValue={loan.cycle}
      />
      <input
        required
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Total Expected Repayment (OS Balance)"
        name="outstandingBalance"
        value={totalRepay}
        onChange={(e) => setTotalRepay(e.target.value)}
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Duration (Weeks) - to regenerate schedule"
        name="durationWeeks"
        value={durationWeeks}
        onChange={(e) => setDurationWeeks(e.target.value)}
      />
      <input
        required
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.installment_size') || 'Installment Size'}
        name="installmentSize"
        value={installment}
        onChange={(e) => setInstallment(e.target.value)}
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.overdue_od') || 'Overdue OD'}
        name="overdueAmount"
        defaultValue={loan.overdueAmount}
      />

      {error ? (
        <p className="md:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      
      <div className="md:col-span-3 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? 'Saving...' : t('buttons.save')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {t('buttons.cancel')}
        </button>
      </div>
    </form>
  );
}
