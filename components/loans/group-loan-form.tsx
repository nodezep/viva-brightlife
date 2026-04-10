'use client';

import {useTransition, useState} from 'react';
import {useTranslations} from 'next-intl';
import {createLoanAction} from '@/lib/actions/loan';
import type {LoanType} from '@/types';
import type {GroupMemberDetail} from '@/lib/data';

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

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.append('loanType', 'vikundi_wakinamama' as LoanType);
    formData.append('groupId', groupId);
    formData.append('repaymentFrequency', 'weekly');

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
      className="no-print grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3"
      action={handleSubmit}
    >
      <select
        required
        className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-3"
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
      {eligibleMembers.length === 0 ? (
        <p className="md:col-span-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No members approved in the Admission Book for this group yet.
        </p>
      ) : null}

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
