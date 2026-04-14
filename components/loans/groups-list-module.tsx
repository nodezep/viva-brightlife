'use client';

import {useState} from 'react';
import {Plus, Trash2, Edit2, X} from 'lucide-react';
import {Link} from '@/lib/navigation';
import type {GroupSummary} from '@/types';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {useProfile} from '@/lib/hooks/use-profile';

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
  const {profile} = useProfile();
  const [permissionError, setPermissionError] = useState('');
  const [editingGroup, setEditingGroup] = useState<GroupSummary | null>(null);

  const clearForm = () => {
    setGroupName('');
    setGroupNumber('');
    setEditingGroup(null);
    setError('');
  };

  const saveGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
    const method = editingGroup ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
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
      setError(message ?? `Failed to ${editingGroup ? 'update' : 'create'} group`);
      setSubmitting(false);
      return;
    }

    const saved = result.group as {
      id: string;
      group_name: string;
      group_number: string;
      group_type: string;
      created_at: string;
    };

    if (editingGroup) {
      setGroups((current) =>
        current.map((g) =>
          g.id === saved.id
            ? {
                ...g,
                name: saved.group_name,
                number: saved.group_number,
                groupName: saved.group_name,
                groupNumber: saved.group_number
              }
            : g
        )
      );
    } else {
      setGroups((current) => [
        {
          id: saved.id,
          name: saved.group_name,
          number: saved.group_number,
          groupName: saved.group_name,
          groupNumber: saved.group_number,
          groupType: saved.group_type,
          createdAt: saved.created_at,
          memberCount: 0
        },
        ...current
      ]);
    }

    clearForm();
    setSubmitting(false);
  };

  const deleteGroup = async (groupId: string) => {
    if (profile?.role && profile.role !== 'admin') {
      setPermissionError(
        'Delete is restricted to admins. Please contact the admin for this action.'
      );
      return;
    }
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

  const startEditing = (group: GroupSummary) => {
    setEditingGroup(group);
    setGroupName(group.groupName ?? group.name);
    setGroupNumber(group.groupNumber ?? group.number);
    setError('');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mikopo ya Vikundi vya Wakina Mama</h1>

      <form onSubmit={saveGroup} className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Group Name</p>
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 ml-1">Group Number</p>
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={groupNumber}
            onChange={(e) => setGroupNumber(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end gap-2 pb-[2px]">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-[38px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {editingGroup ? <Edit2 size={16} /> : <Plus size={16} />}
            {submitting ? 'Saving...' : editingGroup ? 'Update Group' : 'Add Group'}
          </button>
          {editingGroup && (
            <button
              type="button"
              onClick={clearForm}
              className="inline-flex h-[38px] items-center justify-center rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {error ? (
          <p className="md:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
      </form>

      {deleteError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
      ) : null}
      {permissionError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {permissionError}
        </p>
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
                      className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                    >
                      Open Group
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEditing(group)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingGroupId === group.id || (profile?.role && profile.role !== 'admin')}
                      onClick={() => setDeleteTarget(group)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
