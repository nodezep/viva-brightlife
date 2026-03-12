'use client';

import {useState} from 'react';
import {Plus} from 'lucide-react';
import type {GroupMemberDetail} from '@/lib/data';
import {GroupLoanForm} from './group-loan-form';

type Props = {
  groupId: string;
  members: GroupMemberDetail[];
};

export function GroupLoanFormDialog({groupId, members}: Props) {
  const [open, setOpen] = useState(false);
  const canAddLoan = members.length > 0;

  return (
    <div className="no-print">
      <div className="flex justify-end mb-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          onClick={() => setOpen((v) => !v)}
          disabled={!canAddLoan}
        >
          <Plus size={16} /> {open ? 'Close' : 'Add Loan'}
        </button>
      </div>

      {!canAddLoan ? (
        <p className="mb-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
          Add group members first before creating a loan.
        </p>
      ) : null}

      {open ? (
        <div className="mb-4">
          <GroupLoanForm groupId={groupId} members={members} onClose={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
