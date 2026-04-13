'use client';

import {useState} from 'react';
import {Plus} from 'lucide-react';
import type {GroupView} from '@/types';

type Props = {
  initialGroups: GroupView[];
};

export function GroupsModule({initialGroups}: Props) {
  const [groups] = useState<GroupView[]>(initialGroups);
  const [selected, setSelected] = useState<GroupView | null>(
    initialGroups[0] ?? null
  );

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Mikopo ya Vikundi vya Wakina Mama</h1>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Groups</h2>
            <button className="no-print inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
              <Plus size={14} /> Add Group
            </button>
          </div>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selected?.id === group.id ? 'bg-muted' : ''}`}
                onClick={() => setSelected(group)}
              >
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-muted-foreground">{group.number}</p>
              </button>
            ))}
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups found.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">{selected?.name ?? 'Select Group'} Members</h3>
          <ul className="mt-3 space-y-2">
            {(selected?.members ?? []).map((member) => (
              <li
                key={member}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{member}</span>
                <div className="no-print flex gap-2">
                  <button className="rounded-md border px-2 py-1 text-xs">Track Loan</button>
                  <button className="rounded-md border px-2 py-1 text-xs">Remove</button>
                </div>
              </li>
            ))}
            {(selected?.members.length ?? 0) === 0 ? (
              <li className="text-sm text-muted-foreground">No members assigned.</li>
            ) : null}
          </ul>
          <button className="no-print mt-4 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Add Member
          </button>
        </div>
      </div>
    </section>
  );
}
