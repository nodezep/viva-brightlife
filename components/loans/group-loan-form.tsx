'use client';

import {useTransition, useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {createLoanAction} from '@/lib/actions/loan';
import type {LoanType} from '@/types';
import type {GroupMemberDetail} from '@/types';

const Field = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="relative">
    {children}
    <label className="pointer-events-none absolute left-3 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted-foreground peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
      {label}
    </label>
  </div>
);

type Props = {
  groupId: string;
  members: GroupMemberDetail[];
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export function GroupLoanForm({groupId, members, onClose, onSuccess}: Props) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const eligibleMembers = members;

  const [totalRepay, setTotalRepay] = useState('');
  const [installment, setInstallment] = useState('');
  const [returnStartDate, setReturnStartDate] = useState('');

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append('loanType', 'vikundi_wakinamama' as LoanType);
    formData.append('groupId', groupId);
    formData.append('repaymentFrequency', 'weekly');
    if (returnStartDate) {
      formData.append('returnStartDate', returnStartDate);
    }

    startTransition(async () => {
      const result = await createLoanAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess?.('Loan saved successfully.');
        onClose();
      }
    });
  };

  return (
    <form
      className="no-print grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-3"
      action={handleSubmit}
    >
      <div className="md:col-span-3 relative">
        <select
          required
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          name="memberId"
        >
          <option value="">Select member</option>
          {eligibleMembers.map((member) => (
            <option key={member.memberId} value={member.memberId}>
              {member.memberNumber} - {member.fullName} {member.phone ? `(${member.phone})` : ''}
            </option>
          ))}
        </select>
        <label className="pointer-events-none absolute left-3 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
          Member Selection
        </label>
      </div>

      {eligibleMembers.length === 0 ? (
        <p className="md:col-span-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No members found in this group.
        </p>
      ) : null}

      <Field label="Loan Number">
        <input
          required
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="loanNumber"
        />
      </Field>

      <Field label="Disbursement Amount">
        <input
          required
          type="number"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="disbursementAmount"
        />
      </Field>

      <Field label="Security Amount">
        <input
          type="number"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="securityAmount"
        />
      </Field>

      <Field label="Disbursement Date">
        <input
          required
          type="date"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="disbursementDate"
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

      <Field label="Cycle">
        <input
          required
          type="number"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="cycle"
          defaultValue={1}
        />
      </Field>

      <Field label="Total Expected Repayment">
        <input
          required
          type="number"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="outstandingBalance"
          value={totalRepay}
          onChange={(e) => setTotalRepay(e.target.value)}
        />
      </Field>

      <Field label="Installment Size">
        <input
          required
          type="number"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="installmentSize"
          value={installment}
          onChange={(e) => setInstallment(e.target.value)}
        />
      </Field>

      <Field label="Overdue OD">
        <input
          type="number"
          className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
          placeholder=" "
          name="overdueAmount"
        />
      </Field>

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
