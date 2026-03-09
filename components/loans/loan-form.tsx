'use client';

import {useTransition, useState} from 'react';
import {useTranslations} from 'next-intl';
import {createLoanAction} from '@/lib/actions/loan';
import type {LoanType} from '@/types';
import type {MemberOption} from '@/lib/data';

type Props = {
  loanType: LoanType;
  members: MemberOption[];
  onClose: () => void;
};

export function LoanForm({loanType, members, onClose}: Props) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <form
      className="no-print grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3"
      action={handleSubmit}
    >
      <div className="md:col-span-2">
        <select
          name="memberId"
          required
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('actions.select_member') || 'Select Member...'}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName} ({member.memberNumber})
            </option>
          ))}
        </select>
      </div>
      <input
        required
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Loan Number"
        name="loanNumber"
      />
      <input
        required
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Disbursement Amount"
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
        placeholder="Security Amount"
        name="securityAmount"
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Cycle"
        name="cycle"
        defaultValue={1}
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Weekly Installment"
        name="weeklyInstallment"
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Monthly Installment"
        name="monthlyInstallment"
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Amount Withdrawn"
        name="amountWithdrawn"
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="OS Balance"
        name="outstandingBalance"
      />
      <input
        type="number"
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Overdue OD"
        name="overdueAmount"
      />

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
