'use client';

import {useMemo, useState} from 'react';
import {ArrowLeft, Plus, Trash2} from 'lucide-react';
import {Link, useRouter} from '@/lib/navigation';
import type {GroupDetail, GroupMemberDetail, MemberOption} from '@/lib/data';
import type {LoanRecord} from '@/types';
import {LoanTable} from './loan-table';

type Props = {
  group: GroupDetail;
  allMembers: MemberOption[];
  loans: LoanRecord[];
};

export function GroupMembersModule({group, allMembers, loans}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<GroupMemberDetail[]>(group.members);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [roleInGroup, setRoleInGroup] = useState('Member');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'members' | 'loans'>('members');

  const availableMembers = useMemo(() => {
    const assigned = new Set(members.map((member) => member.memberId));
    return allMembers.filter((member) => !assigned.has(member.id));
  }, [allMembers, members]);

  const addMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMemberId) {
      setError('Choose a member first.');
      return;
    }

    setSubmitting(true);
    setError('');

    const response = await fetch(`/api/groups/${group.id}/members`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({memberId: selectedMemberId, roleInGroup})
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? 'Failed to add member');
      setSubmitting(false);
      return;
    }

    const selected = allMembers.find((member) => member.id === selectedMemberId);
    if (selected) {
      setMembers((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          memberId: selected.id,
          memberNumber: selected.memberNumber,
          fullName: selected.fullName,
          phone: selected.phone,
          roleInGroup
        }
      ]);
    }

    setSelectedMemberId('');
    setRoleInGroup('Member');
    setSubmitting(false);
    router.refresh();
  };

  const removeMember = async (memberId: string) => {
    const response = await fetch(`/api/groups/${group.id}/members?memberId=${memberId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      return;
    }

    setMembers((current) => current.filter((member) => member.memberId !== memberId));
    router.refresh();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/mikopo-vikundi-wakinamama" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
            <ArrowLeft size={14} /> Back to Groups
          </Link>
          <h1 className="text-xl font-semibold">{group.groupName}</h1>
          <p className="text-sm text-muted-foreground">{group.groupNumber}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('members')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              view === 'members' ? 'bg-primary text-primary-foreground' : 'bg-card'
            }`}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setView('loans')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              view === 'loans' ? 'bg-primary text-primary-foreground' : 'bg-card'
            }`}
          >
            Loans
          </button>
        </div>
      </div>

      {view === 'members' ? (
        <>
          <form onSubmit={addMember} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
            >
              <option value="">Select member</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.memberNumber} - {member.fullName}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={roleInGroup}
              onChange={(e) => setRoleInGroup(e.target.value)}
              placeholder="Role in group"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <Plus size={16} /> {submitting ? 'Adding...' : 'Add Member'}
            </button>
            {error ? (
              <p className="md:col-span-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
          </form>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/70 text-left">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Member Number</th>
                  <th className="px-3 py-2">Member Name</th>
                  <th className="px-3 py-2 hidden md:table-cell">Phone</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={member.memberId} className="border-t">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{member.memberNumber}</td>
                    <td className="px-3 py-2">{member.fullName}</td>
                    <td className="px-3 py-2 hidden md:table-cell">{member.phone ?? '-'}</td>
                    <td className="px-3 py-2">{member.roleInGroup ?? 'Member'}</td>
                    <td className="px-3 py-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        onClick={() => void removeMember(member.memberId)}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                      No members in this group yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <LoanTable loanType="vikundi_wakinamama" rows={loans} count={loans.length} />
      )}
    </section>
  );
}
