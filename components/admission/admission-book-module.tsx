'use client';

import {useEffect, useMemo, useState, useTransition} from 'react';
import type {AdmissionBookRow, AdmissionGroup} from '@/lib/data';

type Props = {
  initialRows: AdmissionBookRow[];
  groups: AdmissionGroup[];
};

export function AdmissionBookModule({initialRows, groups}: Props) {
  const [rows, setRows] = useState<AdmissionBookRow[]>(initialRows);
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [loadingGroup, setLoadingGroup] = useState(false);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupFilter && row.groupId !== groupFilter) {
        return false;
      }
      if (!lower) {
        return true;
      }
      return (
        row.fullName.toLowerCase().includes(lower) ||
        row.memberNumber.toLowerCase().includes(lower) ||
        row.groupName.toLowerCase().includes(lower)
      );
    });
  }, [rows, query, groupFilter]);

  useEffect(() => {
    if (!groupFilter) {
      setRows(initialRows);
      return;
    }

    setLoadingGroup(true);
    fetch(`/api/admission/members?groupId=${groupFilter}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(Array.isArray(data?.rows) ? data.rows : []);
      })
      .catch(() => {
        setRows([]);
      })
      .finally(() => {
        setLoadingGroup(false);
      });
  }, [groupFilter, initialRows]);

  const toggleBook = (memberId: string, hasBook: boolean) => {
    setError('');
    startTransition(async () => {
      const response = await fetch('/api/admission', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({memberId, hasBook})
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message =
          typeof result.error === 'string'
            ? result.error
            : result.error?.message ??
              (result.error ? JSON.stringify(result.error) : null);
        setError(message ?? 'Failed to update admission book.');
        return;
      }

      setRows((current) =>
        current.map((row) =>
          row.memberId === memberId ? {...row, hasBook} : row
        )
      );
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admission Book</h1>
        <p className="text-sm text-muted-foreground">
          Approve group members who purchased the admission book.
        </p>
      </div>

      <div className={`grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3 ${isPending ? 'opacity-60' : ''}`}>
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Search by name, number, or group"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value="">Select group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({group.number})
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Member Number</th>
              <th className="px-3 py-2">Member Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Has Book</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`${row.groupId}-${row.memberId}`} className="border-t">
                <td className="px-3 py-2">
                  {row.groupName} ({row.groupNumber})
                </td>
                <td className="px-3 py-2">{row.memberNumber}</td>
                <td className="px-3 py-2">{row.fullName}</td>
                <td className="px-3 py-2">{row.phone ?? '-'}</td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.hasBook}
                      onChange={(e) => toggleBook(row.memberId, e.target.checked)}
                    />
                    {row.hasBook ? 'Approved' : 'Not Approved'}
                  </label>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                  {loadingGroup
                    ? 'Loading members...'
                    : groupFilter
                      ? 'No members found for this group.'
                      : 'Select a group to view members.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
