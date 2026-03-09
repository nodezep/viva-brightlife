'use client';

import {useState} from 'react';
import {Plus} from 'lucide-react';
import {Link} from '@/lib/navigation';
import type {GroupSummary} from '@/lib/data';

type Props = {
  initialGroups: GroupSummary[];
};

export function GroupsListModule({initialGroups}: Props) {
  const [groups, setGroups] = useState<GroupSummary[]>(initialGroups);
  const [groupName, setGroupName] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [groupType, setGroupType] = useState('Wakina Mama');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const createGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({groupName, groupNumber, groupType})
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error?.message ?? result.error ?? 'Failed to create group');
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
    setGroupType('Wakina Mama');
    setSubmitting(false);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mikopo ya Vikundi vya Wakina Mama</h1>

      <form onSubmit={createGroup} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
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
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Group Type"
          value={groupType}
          onChange={(e) => setGroupType(e.target.value)}
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
          <p className="md:col-span-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Group Number</th>
              <th className="px-3 py-2">Group Name</th>
              <th className="px-3 py-2">Group Type</th>
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
                <td className="px-3 py-2">{group.groupType}</td>
                <td className="px-3 py-2">{group.memberCount}</td>
                <td className="px-3 py-2">{new Date(group.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/mikopo-vikundi-wakinamama/${group.id}`}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Open Group
                  </Link>
                </td>
              </tr>
            ))}
            {groups.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                  No groups found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
