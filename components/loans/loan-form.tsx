'use client';

import {useTransition, useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {createLoanAction} from '@/lib/actions/loan';
import type {LoanType} from '@/types';
import {useRouter} from '@/lib/navigation';

type Props = {
  loanType: LoanType;
  onClose: () => void;
};

export function LoanForm({loanType, onClose}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isIndividual = loanType === 'binafsi';

  // States for automatic calculation
  const [totalRepay, setTotalRepay] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [installment, setInstallment] = useState('');
  const [repaymentFrequency, setRepaymentFrequency] = useState<'weekly' | 'daily'>('weekly');

  // Individual loan (binafsi) states
  const [principal, setPrincipal] = useState('');
  const [principalDisplay, setPrincipalDisplay] = useState('');
  const [disbursementDate, setDisbursementDate] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountPaidDisplay, setAmountPaidDisplay] = useState('');
  const [daysOverdue, setDaysOverdue] = useState('');
  const [memberSerial, setMemberSerial] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [disbursementAmount, setDisbursementAmount] = useState('');
  const [disbursementAmountDisplay, setDisbursementAmountDisplay] = useState('');
  const [securityAmount, setSecurityAmount] = useState('');
  const [securityAmountDisplay, setSecurityAmountDisplay] = useState('');
  const [overdueAmount, setOverdueAmount] = useState('');
  const [overdueAmountDisplay, setOverdueAmountDisplay] = useState('');
  const [installmentDisplay, setInstallmentDisplay] = useState('');
  const [totalRepayDisplay, setTotalRepayDisplay] = useState('');

  // Auto-calculate installment size based on Total Repay and Weeks
  useEffect(() => {
    const repayVal = Number(totalRepay);
    const weeksVal = Number(durationWeeks);
    if (repayVal > 0 && weeksVal > 0) {
      const perPeriod = repayVal / weeksVal;
      // Round to nearest 100 as per common microfinance practice
      const suggested = Math.ceil(perPeriod / 100) * 100;
      setInstallment(suggested.toString());
    } else if (!repayVal || !weeksVal) {
      setInstallment('');
    }
  }, [totalRepay, durationWeeks]);

  useEffect(() => {
    setInstallmentDisplay(formatNumber(installment));
  }, [installment]);

  useEffect(() => {
    setTotalRepayDisplay(formatNumber(totalRepay));
  }, [totalRepay]);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append('loanType', loanType);

    startTransition(async () => {
      const result = await createLoanAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  const durationMonthsValue = Number(durationMonths) || 0;
  const loanNumber = memberSerial ? memberSerial : '';

  return (
    <form
      className="no-print grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3"
      action={handleSubmit}
    >
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
      />
      <input
        required
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.member_name') || 'Member Name'}
        name="memberName"
      />
      <input
        required
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.loan_number') || 'Loan Number'}
        name="loanNumber"
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
      />
      <input
        type="date"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        name="returnStartDate"
        placeholder="Return Start Date (optional)"
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
        defaultValue={1}
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
      {loanType !== 'vikundi_wakinamama' ? (
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
        required={loanType === 'vyombo_moto'}
        type="number"
        min={1}
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={repaymentFrequency === 'daily' ? 'Duration (Days)' : 'Duration (Weeks)'}
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

      {loanType === 'electronics' ? (
        <>
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Item Type (TV/AC/Fridge/Cooker)" name="itemType" />
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Brand / Model" name="brandModel" />
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Warranty Period" name="warrantyPeriod" />
        </>
      ) : null}
      
      {loanType === 'kilimo' ? (
        <>
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Crop Type" name="cropType" />
          <input type="number" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Farm Size (Acres)" name="farmSizeAcres" />
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Season" name="season" />
        </>
      ) : null}
      
      {loanType === 'vyombo_moto' ? (
        <>
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Vehicle Type" name="vehicleType" />
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Make / Model" name="brandModel" />
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Registration Number" name="registrationNumber" />
          <input type="number" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Year of Manufacture" name="yearOfManufacture" />
        </>
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
  const stripNumber = (value: string) =>
    value.replace(/,/g, '').replace(/[^\d.]/g, '');

  const formatNumber = (value: string) => {
    if (!value) return '';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '';
    return new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(numeric);
  };
