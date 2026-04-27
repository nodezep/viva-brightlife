'use client';

import {useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import type {GroupMemberDetail} from '@/types';
import {createClient} from '@/lib/supabase/client';
import {GroupLoanForm} from './group-loan-form';

type Props = {
  groupId: string;
  members: GroupMemberDetail[];
};

export function GroupLoanFormDialog({groupId, members}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedMembers, setResolvedMembers] = useState<GroupMemberDetail[]>(members);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setResolvedMembers(members);
  }, [members]);

  // Removed redundant and fragile client-side re-fetching that caused RLS issues for non-admins.
  // We rely on the members passed from the parent which are fetched on the server.


  const canAddLoan = resolvedMembers.length > 0;

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
      {successMessage ? (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {open ? (
        <div className="mb-4">
          {loading ? (
            <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              Loading eligible members...
            </p>
          ) : (
            <GroupLoanForm
              groupId={groupId}
              members={resolvedMembers}
              onClose={() => setOpen(false)}
              onSuccess={(message) => {
                setSuccessMessage(message);
                setTimeout(() => setSuccessMessage(''), 4000);
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
