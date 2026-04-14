'use client';

import {useTransition, useState} from 'react';
import {useTranslations} from 'next-intl';
import {createLoanAction} from '@/lib/actions/loan';
import type {LoanType} from '@/types';
import type {GroupMemberDetail} from '@/types';

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
  const eligibleMembers = members.filter((member) => member.hasBook);

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
      <div className="md:col-span-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Member Selection</p>
        <select
          required
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
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
      </div>

      {eligibleMembers.length === 0 ? (
        <p className="md:col-span-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No members approved in the Admission Book for this group yet.
        </p>
      ) : null}

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Loan Number</p>
        <input
          required
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="loanNumber"
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Disbursement Amount</p>
        <input
          required
          type="number"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="disbursementAmount"
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Security Amount</p>
        <input
          type="number"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="securityAmount"
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Disbursement Date</p>
        <input
          required
          type="date"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="disbursementDate"
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Return Start Date</p>
        <input
          required
          type="date"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="returnStartDate"
          value={returnStartDate}
          onChange={(e) => setReturnStartDate(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Cycle</p>
        <input
          required
          type="number"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="cycle"
          defaultValue={1}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Total Expected Repayment</p>
        <input
          required
          type="number"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="outstandingBalance"
          value={totalRepay}
          onChange={(e) => setTotalRepay(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Installment Size</p>
        <input
          required
          type="number"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="installmentSize"
          value={installment}
          onChange={(e) => setInstallment(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Overdue OD</p>
        <input
          type="number"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          name="overdueAmount"
        />
      </div>

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
