'use client';

import {useTransition, useState, useEffect, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {updateLoanAction} from '@/lib/actions/loan';
import type {LoanRecord} from '@/types';
import {useRouter} from '@/lib/navigation';

type Props = {
  loan: LoanRecord;
  onClose: () => void;
};

const Field = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="relative">
    {children}
    <label className="pointer-events-none absolute left-3 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted-foreground peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
      {label}
    </label>
  </div>
);

export function LoanEditForm({loan, onClose}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const isIndividual = loan.loanType === 'binafsi';

  const [totalRepay, setTotalRepay] = useState(String(loan.outstandingBalance ?? ''));
  const [installment, setInstallment] = useState(String(loan.installmentSize ?? ''));
  const [repaymentFrequency, setRepaymentFrequency] = useState<
    'weekly' | 'daily' | 'monthly'
  >(
    loan.repaymentFrequency === 'daily'
      ? 'daily'
      : loan.repaymentFrequency === 'monthly'
        ? 'monthly'
        : 'weekly'
  );
  const [itemDescription, setItemDescription] = useState(
    loan.itemDescription ?? ''
  );

  const [principal, setPrincipal] = useState(String(loan.disbursementAmount ?? ''));
  const [principalDisplay, setPrincipalDisplay] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(loan.disbursementDate ?? '');
  const [returnStartDate, setReturnStartDate] = useState(loan.returnStartDate ?? '');
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
        setSuccessMessage('Loan updated successfully.');
        setTimeout(() => setSuccessMessage(''), 4000);
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
          <Field label="S/NO">
            <input
              required
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="memberNumber"
              value={memberSerial}
              onChange={(e) => setMemberSerial(e.target.value)}
            />
          </Field>
          <Field label="Jina">
            <input
              required
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="memberName"
              defaultValue={loan.memberName}
            />
          </Field>
          <Field label="Kiasi cha Mkopo">
            <input
              required
              type="text"
              inputMode="numeric"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              value={principalDisplay}
              onChange={(e) => {
                const raw = stripNumber(e.target.value);
                setPrincipal(raw);
                setPrincipalDisplay(formatNumber(raw));
              }}
            />
          </Field>
          <input type="hidden" name="disbursementAmount" value={principal} />
          <Field label="Disbursement Date">
            <input
              required
              type="date"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="disbursementDate"
              value={disbursementDate}
              onChange={(e) => setDisbursementDate(e.target.value)}
            />
          </Field>
          <Field label="Return Start Date">
            <input
              required
              type="date"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="returnStartDate"
              value={returnStartDate}
              onChange={(e) => setReturnStartDate(e.target.value)}
            />
          </Field>
          <Field label="Idadi ya Siku za Malimbikizo">
            <input
              type="number"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="daysOverdue"
              value={daysOverdue}
              onChange={(e) => setDaysOverdue(e.target.value)}
              min={0}
            />
          </Field>
          <Field label="Asilimia ya Riba">
            <input
              required
              type="text"
              inputMode="decimal"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="interestRate"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              min={0}
              step="0.01"
            />
          </Field>
          <Field label="Muda wa Mkopo (Mwezi)">
            <input
              type="number"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="durationMonths"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              min={1}
            />
          </Field>
          <Field label="Malipo ya Mkopo">
            <input
              type="text"
              inputMode="numeric"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              value={amountPaidDisplay}
              onChange={(e) => {
                const raw = stripNumber(e.target.value);
                setAmountPaid(raw);
                setAmountPaidDisplay(formatNumber(raw));
              }}
              min={0}
            />
          </Field>
          <input type="hidden" name="amountPaid" value={amountPaid} />
          <Field label="Namba ya Simu">
            <input
              type="tel"
              className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
              placeholder=" "
              name="memberPhone"
              value={memberPhone}
              onChange={(e) => setMemberPhone(e.target.value)}
            />
          </Field>
      <input type="hidden" name="cycle" value={durationMonthsValue || 1} />
          <input type="hidden" name="durationWeeks" value={0} />
          <input type="hidden" name="overdueAmount" value={0} />
          <input type="hidden" name="loanNumber" value={loanNumber} />
        </>
      ) : (
        <>
      <Field label={t('table.member_number') || 'Member Number'}>
        <input
          required
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="memberNumber"
          defaultValue={loan.memberNumber}
        />
      </Field>
      <Field label={t('table.member_name') || 'Member Name'}>
        <input
          required
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="memberName"
          defaultValue={loan.memberName}
        />
      </Field>
      {loan.loanType === 'electronics' ? (
        <Field label="Product Name">
          <input
            className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
            placeholder=" "
            name="itemDescription"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
          />
        </Field>
      ) : null}
      <Field label={t('table.loan_number') || 'Loan Number'}>
        <input
          required
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="loanNumber"
          defaultValue={loan.loanNumber}
        />
      </Field>
      <Field label={t('table.disbursement_amount') || 'Disbursement Amount'}>
        <input
          required
          type="text"
          inputMode="numeric"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={disbursementAmountDisplay}
          onChange={(e) => {
            const raw = stripNumber(e.target.value);
            setDisbursementAmount(raw);
            setDisbursementAmountDisplay(formatNumber(raw));
          }}
        />
      </Field>
      <input type="hidden" name="disbursementAmount" value={disbursementAmount} />
      <Field label="Disbursement Date">
        <input
          required
          type="date"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="disbursementDate"
          defaultValue={loan.disbursementDate}
        />
      </Field>
      <Field label="Return Start Date">
        <input
          required
          type="date"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="returnStartDate"
          value={returnStartDate}
          onChange={(e) => setReturnStartDate(e.target.value)}
        />
      </Field>
      <Field label={t('table.security_amount') || 'Security Amount'}>
        <input
          type="text"
          inputMode="numeric"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={securityAmountDisplay}
          onChange={(e) => {
            const raw = stripNumber(e.target.value);
            setSecurityAmount(raw);
            setSecurityAmountDisplay(formatNumber(raw));
          }}
        />
      </Field>
      <input type="hidden" name="securityAmount" value={securityAmount} />
      <Field label={t('table.cycle') || 'Cycle'}>
        <input
          required
          type="number"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="cycle"
          defaultValue={loan.cycle}
        />
      </Field>
      <Field label="Total Expected Repayment (OS Balance)">
        <input
          required
          type="text"
          inputMode="numeric"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={totalRepayDisplay}
          onChange={(e) => {
            const raw = stripNumber(e.target.value);
            setTotalRepay(raw);
            setTotalRepayDisplay(formatNumber(raw));
          }}
        />
      </Field>
      <input type="hidden" name="outstandingBalance" value={totalRepay} />
      {loan.loanType !== 'vikundi_wakinamama' ? (
        <Field label="Repayment Frequency">
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={repaymentFrequency}
            onChange={(e) =>
              setRepaymentFrequency(
                e.target.value as 'weekly' | 'daily' | 'monthly'
              )
            }
            name="repaymentFrequency"
          >
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
      ) : (
        <input type="hidden" name="repaymentFrequency" value="weekly" />
      )}
      <Field label={t('table.installment_size') || 'Installment Size'}>
        <input
          required
          type="text"
          inputMode="numeric"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={installmentDisplay}
          onChange={(e) => {
            const raw = stripNumber(e.target.value);
            setInstallment(raw);
            setInstallmentDisplay(formatNumber(raw));
          }}
        />
      </Field>
      <input type="hidden" name="installmentSize" value={installment} />
      <Field label={t('table.overdue_od') || 'Overdue OD'}>
        <input
          type="text"
          inputMode="numeric"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          value={overdueAmountDisplay}
          onChange={(e) => {
            const raw = stripNumber(e.target.value);
            setOverdueAmount(raw);
            setOverdueAmountDisplay(formatNumber(raw));
          }}
        />
      </Field>
      <input type="hidden" name="overdueAmount" value={overdueAmount} />
        </>
      )}

      {successMessage ? (
        <p className="md:col-span-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}
      {error ? (
        <p className="md:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      
      <div className="md:col-span-3 flex gap-2 sticky bottom-0 z-10 -mx-4 border-t bg-card/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
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
