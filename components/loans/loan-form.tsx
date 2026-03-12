'use client';

import {useTransition, useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {createLoanAction} from '@/lib/actions/loan';
import type {LoanType} from '@/types';

type Props = {
  loanType: LoanType;
  onClose: () => void;
};

export function LoanForm({loanType, onClose}: Props) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isIndividual = loanType === 'binafsi';

  // States for automatic calculation
  const [totalRepay, setTotalRepay] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [installment, setInstallment] = useState('');

  // Individual loan (binafsi) states
  const [principal, setPrincipal] = useState('');
  const [disbursementDate, setDisbursementDate] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [daysOverdue, setDaysOverdue] = useState('');
  const [memberSerial, setMemberSerial] = useState('');
  const [memberPhone, setMemberPhone] = useState('');

  // Auto-calculate installment size based on Total Repay and Weeks
  useEffect(() => {
    const repayVal = Number(totalRepay);
    const weeksVal = Number(durationWeeks);
    if (repayVal > 0 && weeksVal > 0) {
      const perWeek = repayVal / weeksVal;
      // Round to nearest 100 as per common microfinance practice
      const suggested = Math.ceil(perWeek / 100) * 100;
      setInstallment(suggested.toString());
    } else if (!repayVal || !weeksVal) {
      setInstallment('');
    }
  }, [totalRepay, durationWeeks]);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append('loanType', loanType);

    startTransition(async () => {
      const result = await createLoanAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  const durationMonthsValue = Number(durationMonths) || 0;
  const loanNumber = memberSerial ? `BIN-${memberSerial}` : '';

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
            type="number"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Kiasi cha Mkopo"
            name="disbursementAmount"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
          />
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
            type="number"
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
            type="number"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Malipo ya Mkopo"
            name="amountPaid"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            min={0}
          />
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
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.disbursement_amount') || 'Disbursement Amount'}
        name="disbursementAmount"
      />
      <input
        required
        type="date"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        name="disbursementDate"
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder={t('table.security_amount') || 'Security Amount'}
        name="securityAmount"
      />
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
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Total Expected Repayment (OS Balance)"
        name="outstandingBalance"
        value={totalRepay}
        onChange={(e) => setTotalRepay(e.target.value)}
      />
      <input
        required
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Duration (Weeks)"
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
      />
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
