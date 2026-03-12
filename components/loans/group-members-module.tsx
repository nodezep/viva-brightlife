'use client';

import {useState} from 'react';
import {ArrowLeft, Plus, Trash2} from 'lucide-react';
import {useRouter} from '@/lib/navigation';
import type {GroupDetail, GroupMemberDetail} from '@/lib/data';
import type {LoanRecord} from '@/types';
import {LoanTable} from './loan-table';
import {GroupLoanFormDialog} from './group-loan-form-dialog';

type Props = {
  group: GroupDetail;
  loans: LoanRecord[];
};

export function GroupMembersModule({group, loans}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<GroupMemberDetail[]>(group.members);
  const [showNewRow, setShowNewRow] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberNumber, setNewMemberNumber] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'members' | 'loans'>('members');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('Member');
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const addMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newMemberName) {
      setError('Enter member name first.');
      return;
    }

    setSubmitting(true);
    setError('');

    const response = await fetch(`/api/groups/${group.id}/members`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        memberNumber: newMemberNumber,
        fullName: newMemberName,
        phone: newMemberPhone,
        roleInGroup: newMemberRole
      })
    });

    const result = await response.json();
    if (!response.ok) {
      const message =
        typeof result.error === 'string'
          ? result.error
          : result.error?.message ??
            (result.error ? JSON.stringify(result.error) : null);
      setError(message ?? 'Failed to add member');
      setSubmitting(false);
      return;
    }

    const created = result.member as {
      id: string;
      member_number: string;
      full_name: string;
      phone: string | null;
    } | null;

    if (created) {
      setMembers((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          memberId: created.id,
          memberNumber: created.member_number,
          fullName: created.full_name,
          phone: created.phone ?? null,
          roleInGroup: newMemberRole
        }
      ]);
    }

    setNewMemberName('');
    setNewMemberNumber('');
    setNewMemberPhone('');
    setNewMemberRole('Member');
    setSubmitting(false);
    setShowNewRow(false);
    router.refresh();
  };

  const startEdit = (member: GroupMemberDetail) => {
    setEditingMemberId(member.memberId);
    setEditName(member.fullName);
    setEditNumber(member.memberNumber ?? '');
    setEditPhone(member.phone ?? '');
    setEditRole(member.roleInGroup ?? 'Member');
  };

  const cancelEdit = () => {
    setEditingMemberId(null);
    setEditName('');
    setEditNumber('');
    setEditPhone('');
    setEditRole('Member');
  };

  const saveEdit = async (memberId: string) => {
    if (!editName) {
      setError('Member name is required.');
      return;
    }

    setSavingMemberId(memberId);
    setError('');

    const response = await fetch(`/api/groups/${group.id}/members`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        memberId,
        memberNumber: editNumber,
        fullName: editName,
        phone: editPhone,
        roleInGroup: editRole
      })
    });

    const result = await response.json();
    if (!response.ok) {
      const message =
        typeof result.error === 'string'
          ? result.error
          : result.error?.message ??
            (result.error ? JSON.stringify(result.error) : null);
      setError(message ?? 'Failed to update member');
      setSavingMemberId(null);
      return;
    }

    const updated = result.member as {
      id: string;
      member_number: string;
      full_name: string;
      phone: string | null;
    } | null;

    if (updated) {
      setMembers((current) =>
        current.map((member) =>
          member.memberId === memberId
            ? {
                ...member,
                memberNumber: updated.member_number,
                fullName: updated.full_name,
                phone: updated.phone ?? null,
                roleInGroup: result.roleInGroup ?? editRole
              }
            : member
        )
      );
    }

    setSavingMemberId(null);
    cancelEdit();
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
          <button
            type="button"
            onClick={() => router.push('/mikopo-vikundi-wakinamama')}
            className="mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft size={14} /> Back to Groups
          </button>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowNewRow((value) => !value)}
              className="inline-flex items-center gap-2"
            >
              <Plus size={16} /> {showNewRow ? 'Close Form' : 'Add New Member'}
            </button>
            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
          </div>

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
                {showNewRow ? (
                  <tr className="border-t bg-muted/40">
                    <td className="px-3 py-2 text-sm text-muted-foreground">New</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberNumber}
                        onChange={(e) => setNewMemberNumber(e.target.value)}
                        placeholder="e.g. M-001"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="Member name"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        placeholder="Phone"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="Role"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <form onSubmit={addMember} className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        >
                          <Plus size={12} /> {submitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewRow(false)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : null}
                {members.map((member, index) => (
                  <tr key={member.memberId} className="border-t">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          placeholder={member.memberNumber}
                        />
                      ) : (
                        member.memberNumber
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        member.fullName
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      ) : (
                        member.phone ?? '-'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                        />
                      ) : (
                        member.roleInGroup ?? 'Member'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingMemberId === member.memberId}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            onClick={() => void saveEdit(member.memberId)}
                          >
                            {savingMemberId === member.memberId ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            onClick={() => startEdit(member)}
                          >
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            onClick={() => void removeMember(member.memberId)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
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
        <>
          <GroupLoanFormDialog groupId={group.id} members={group.members} />
          <LoanTable loanType="vikundi_wakinamama" rows={loans} count={loans.length} />
        </>
      )}
    </section>
  );
}
