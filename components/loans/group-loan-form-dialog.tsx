'use client';

import {useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import type {GroupMemberDetail} from '@/lib/data';
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const loadMembers = async () => {
      setLoading(true);
      const links = await supabase
        .from('group_members')
        .select('member_id,role_in_group,joined_at')
        .eq('group_id', groupId)
        .order('joined_at', {ascending: true});

      if (cancelled) {
        return;
      }

      if (links.error || !links.data || links.data.length === 0) {
        setResolvedMembers([]);
        setLoading(false);
        return;
      }

      const memberIds = links.data.map((row) => row.member_id);
      const roleMap = new Map(
        links.data.map((row) => [row.member_id, row.role_in_group ?? null])
      );

      const [membersResult, admissionResult] = await Promise.all([
        supabase.from('members').select('id,member_number,full_name,phone').in('id', memberIds),
        supabase.from('admission_books').select('member_id,has_book').in('member_id', memberIds)
      ]);

      if (cancelled) {
        return;
      }

      if (membersResult.error || !membersResult.data) {
        setResolvedMembers([]);
        setLoading(false);
        return;
      }

      const memberMap = new Map(
        membersResult.data.map((member) => [
          member.id,
          {
            memberNumber: member.member_number,
            fullName: member.full_name,
            phone: member.phone ?? null
          }
        ])
      );

      const admissionMap = new Map(
        (admissionResult.data ?? []).map((row) => [row.member_id, row.has_book])
      );

      const mapped = memberIds.map((memberId) => {
        const member = memberMap.get(memberId);
        return {
          id: `${groupId}-${memberId}`,
          memberId,
          memberNumber: member?.memberNumber ?? '-',
          fullName: member?.fullName ?? '-',
          phone: member?.phone ?? null,
          roleInGroup: roleMap.get(memberId) ?? null,
          hasBook: Boolean(admissionMap.get(memberId))
        };
      });

      setResolvedMembers(mapped);
      setLoading(false);
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [groupId, open]);

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
