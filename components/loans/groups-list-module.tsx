'use client';

import {useState} from 'react';
import {Plus, Trash2} from 'lucide-react';
import {Link} from '@/lib/navigation';
import type {GroupSummary} from '@/lib/data';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';

type Props = {
  initialGroups: GroupSummary[];
};

export function GroupsListModule({initialGroups}: Props) {
  const [groups, setGroups] = useState<GroupSummary[]>(initialGroups);
  const [groupName, setGroupName] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupSummary | null>(null);

  const createGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({groupName, groupNumber})
    });

    const result = await response.json();

    if (!response.ok) {
      const message =
        typeof result.error === 'string'
          ? result.error
          : result.error?.message ??
            (result.error ? JSON.stringify(result.error) : null);
      setError(message ?? 'Failed to create group');
      setSubmitting(false);
      return;
    }

    const created = result.group as {
      id: string;
      group_name: string;
      group_number: string;
      group_type: string;
      created_at: string;
    };

    setGroups((current) => [
      {
        id: created.id,
        groupName: created.group_name,
        groupNumber: created.group_number,
        groupType: created.group_type,
        createdAt: created.created_at,
        memberCount: 0
      },
      ...current
    ]);

    setGroupName('');
    setGroupNumber('');
    setSubmitting(false);
  };

  const deleteGroup = async (groupId: string) => {
    setDeletingGroupId(groupId);
    setDeleteError('');

    const response = await fetch(`/api/groups/${groupId}`, {method: 'DELETE'});
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof result.error === 'string'
          ? result.error
          : result.error?.message ??
            (result.error ? JSON.stringify(result.error) : null);
      setDeleteError(message ?? 'Failed to delete group');
      setDeletingGroupId(null);
      return;
    }

    setGroups((current) => current.filter((group) => group.id !== groupId));
    setDeletingGroupId(null);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mikopo ya Vikundi vya Wakina Mama</h1>

      <form onSubmit={createGroup} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
        />
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Group Number"
          value={groupNumber}
          onChange={(e) => setGroupNumber(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Plus size={16} /> {submitting ? 'Saving...' : 'Add Group'}
        </button>
        {error ? (
          <p className="md:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
      </form>

      {deleteError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Group Number</th>
              <th className="px-3 py-2">Group Name</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr key={group.id} className="border-t">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{group.groupNumber}</td>
                <td className="px-3 py-2">{group.groupName}</td>
                <td className="px-3 py-2">{group.memberCount}</td>
                <td className="px-3 py-2">{new Date(group.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/mikopo-vikundi-wakinamama/${group.id}`}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      Open Group
                    </Link>
                    <button
                      type="button"
                      disabled={deletingGroupId === group.id}
                      onClick={() => setDeleteTarget(group)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                    >
                      <Trash2 size={12} />
                      {deletingGroupId === group.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                  No groups found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Group"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.groupName}"? This will remove the group and all its members from it.`
            : ''
        }
        confirmLabel={deletingGroupId ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          void deleteGroup(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}
