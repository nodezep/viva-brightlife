'use client';

import {useTransition, useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {updateLoanAction} from '@/lib/actions/loan';
import type {LoanRecord} from '@/types';
import {useRouter} from '@/lib/navigation';

type Props = {
  loan: LoanRecord;
  onClose: () => void;
};

export function LoanEditForm({loan, onClose}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isIndividual = loan.loanType === 'binafsi';

  const [totalRepay, setTotalRepay] = useState(String(loan.outstandingBalance ?? ''));
  const [durationWeeks, setDurationWeeks] = useState('');
  const [installment, setInstallment] = useState(String(loan.installmentSize ?? ''));
  const [repaymentFrequency, setRepaymentFrequency] = useState<'weekly' | 'daily'>(
    loan.repaymentFrequency === 'daily' ? 'daily' : 'weekly'
  );

  const [principal, setPrincipal] = useState(String(loan.disbursementAmount ?? ''));
  const [principalDisplay, setPrincipalDisplay] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(loan.disbursementDate ?? '');
  const [durationMonths, setDurationMonths] = useState(
    loan.durationMonths ? String(loan.durationMonths) : ''
  );
  const [memberSerial, setMemberSerial] = useState(loan.memberNumber ?? '');
  const [interestRate, setInterestRate] = useState(() => {
    if (loan.interestRate && loan.interestRate > 0) {
      return Number(loan.interestRate).toFixed(2);
    }
    const principalValue = Number(loan.disbursementAmount) || 0;
    const interestAmount = Number(loan.securityAmount) || 0;
    if (principalValue <= 0 || interestAmount <= 0) {
      return '';
    }
    return ((interestAmount / principalValue) * 100).toFixed(2);
  });
  const [amountPaid, setAmountPaid] = useState(
    loan.amountPaid ? String(loan.amountPaid) : ''
  );
  const [amountPaidDisplay, setAmountPaidDisplay] = useState('');
  const [memberPhone, setMemberPhone] = useState(loan.memberPhone ?? '');
  const [daysOverdue, setDaysOverdue] = useState(
    loan.daysOverdue ? String(loan.daysOverdue) : ''
  );
  const [disbursementAmount, setDisbursementAmount] = useState(
    loan.disbursementAmount ? String(loan.disbursementAmount) : ''
  );
  const [disbursementAmountDisplay, setDisbursementAmountDisplay] = useState('');
  const [securityAmount, setSecurityAmount] = useState(
    loan.securityAmount ? String(loan.securityAmount) : ''
  );
  const [securityAmountDisplay, setSecurityAmountDisplay] = useState('');
  const [overdueAmount, setOverdueAmount] = useState(
    loan.overdueAmount ? String(loan.overdueAmount) : ''
  );
  const [overdueAmountDisplay, setOverdueAmountDisplay] = useState('');
  const [installmentDisplay, setInstallmentDisplay] = useState('');
  const [totalRepayDisplay, setTotalRepayDisplay] = useState('');

  const stripNumber = (value: string) =>
    value.replace(/,/g, '').replace(/[^\d.]/g, '');

  const formatNumber = (value: string) => {
    if (!value) return '';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '';
    return new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(numeric);
  };

  useEffect(() => {
    setPrincipalDisplay(formatNumber(principal));
  }, [principal]);

  useEffect(() => {
    setAmountPaidDisplay(formatNumber(amountPaid));
  }, [amountPaid]);

  useEffect(() => {
    const repayVal = Number(totalRepay);
    const weeksVal = Number(durationWeeks);
    if (repayVal > 0 && weeksVal > 0) {
    const perPeriod = repayVal / weeksVal;
    const suggested = Math.ceil(perPeriod / 100) * 100;
    setInstallment(suggested.toString());
  }
}, [totalRepay, durationWeeks]);

  useEffect(() => {
    setDisbursementAmountDisplay(formatNumber(disbursementAmount));
  }, [disbursementAmount]);

  useEffect(() => {
    setSecurityAmountDisplay(formatNumber(securityAmount));
  }, [securityAmount]);

  useEffect(() => {
    setOverdueAmountDisplay(formatNumber(overdueAmount));
  }, [overdueAmount]);

  useEffect(() => {
    setInstallmentDisplay(formatNumber(installment));
  }, [installment]);

  useEffect(() => {
    setTotalRepayDisplay(formatNumber(totalRepay));
  }, [totalRepay]);

  const durationMonthsValue = Number(durationMonths) || 0;
  const loanNumber = loan.loanNumber || (memberSerial ? memberSerial : '');

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await updateLoanAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <form
      className="no-print grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3"
      action={handleSubmit}
    >
      <input type="hidden" name="loanId" value={loan.id} />
      {isIndividual ? (
        <>
          <input
            required
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="S/NO"
            name="memberNumber"
            value={memberSerial}
            onChange={(e) => setMemberSerial(e.target.value)}
          />
          <input
            required
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Jina"
            name="memberName"
            defaultValue={loan.memberName}
          />
          <input
            required
            type="text"
            inputMode="numeric"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Kiasi cha Mkopo"
            value={principalDisplay}
            onChange={(e) => {
              const raw = stripNumber(e.target.value);
              setPrincipal(raw);
              setPrincipalDisplay(formatNumber(raw));
            }}
          />
          <input type="hidden" name="disbursementAmount" value={principal} />
          <input
            required
            type="date"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            name="disbursementDate"
            value={disbursementDate}
            onChange={(e) => setDisbursementDate(e.target.value)}
          />
          <input
            type="number"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Idadi ya Siku za Malimbikizo"
            name="daysOverdue"
            value={daysOverdue}
            onChange={(e) => setDaysOverdue(e.target.value)}
            min={0}
          />
          <input
            required
            type="text"
            inputMode="decimal"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Asilimia ya Riba"
            name="interestRate"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            min={0}
            step="0.01"
          />
          <input
            type="number"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Muda wa Mkopo (Mwezi)"
            name="durationMonths"
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            min={1}
          />
          <input
            type="text"
            inputMode="numeric"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Malipo ya Mkopo"
            value={amountPaidDisplay}
            onChange={(e) => {
              const raw = stripNumber(e.target.value);
              setAmountPaid(raw);
              setAmountPaidDisplay(formatNumber(raw));
            }}
            min={0}
          />
          <input type="hidden" name="amountPaid" value={amountPaid} />
          <input
            type="tel"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Namba ya Simu"
            name="memberPhone"
            value={memberPhone}
            onChange={(e) => setMemberPhone(e.target.value)}
          />

          <input type="hidden" name="cycle" value={durationMonthsValue || 1} />
          <input type="hidden" name="durationWeeks" value={0} />
          <input type="hidden" name="overdueAmount" value={0} />
          <input type="hidden" name="loanNumber" value={loanNumber} />
        </>
      ) : (
        <>
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
        type="text"
        inputMode="numeric"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.disbursement_amount') || 'Disbursement Amount'}
        value={disbursementAmountDisplay}
        onChange={(e) => {
          const raw = stripNumber(e.target.value);
          setDisbursementAmount(raw);
          setDisbursementAmountDisplay(formatNumber(raw));
        }}
      />
      <input type="hidden" name="disbursementAmount" value={disbursementAmount} />
      <input
        required
        type="date"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        name="disbursementDate"
        defaultValue={loan.disbursementDate}
      />
      <input
        type="text"
        inputMode="numeric"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.security_amount') || 'Security Amount'}
        value={securityAmountDisplay}
        onChange={(e) => {
          const raw = stripNumber(e.target.value);
          setSecurityAmount(raw);
          setSecurityAmountDisplay(formatNumber(raw));
        }}
      />
      <input type="hidden" name="securityAmount" value={securityAmount} />
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
        type="text"
        inputMode="numeric"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Total Expected Repayment (OS Balance)"
        value={totalRepayDisplay}
        onChange={(e) => {
          const raw = stripNumber(e.target.value);
          setTotalRepay(raw);
          setTotalRepayDisplay(formatNumber(raw));
        }}
      />
      <input type="hidden" name="outstandingBalance" value={totalRepay} />
      {loan.loanType !== 'vikundi_wakinamama' ? (
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={repaymentFrequency}
          onChange={(e) => setRepaymentFrequency(e.target.value as 'weekly' | 'daily')}
          name="repaymentFrequency"
        >
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
      ) : (
        <input type="hidden" name="repaymentFrequency" value="weekly" />
      )}
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={
          repaymentFrequency === 'daily'
            ? 'Duration (Days) - to regenerate schedule'
            : 'Duration (Weeks) - to regenerate schedule'
        }
        name="durationWeeks"
        value={durationWeeks}
        onChange={(e) => setDurationWeeks(e.target.value)}
      />
      <input
        required
        type="text"
        inputMode="numeric"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.installment_size') || 'Installment Size'}
        value={installmentDisplay}
        onChange={(e) => {
          const raw = stripNumber(e.target.value);
          setInstallment(raw);
          setInstallmentDisplay(formatNumber(raw));
        }}
      />
      <input type="hidden" name="installmentSize" value={installment} />
      <input
        type="text"
        inputMode="numeric"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.overdue_od') || 'Overdue OD'}
        value={overdueAmountDisplay}
        onChange={(e) => {
          const raw = stripNumber(e.target.value);
          setOverdueAmount(raw);
          setOverdueAmountDisplay(formatNumber(raw));
        }}
      />
      <input type="hidden" name="overdueAmount" value={overdueAmount} />
        </>
      )}

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
