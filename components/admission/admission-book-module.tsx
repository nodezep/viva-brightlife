'use client';

import {useEffect, useMemo, useState, useTransition} from 'react';
import type {AdmissionBookRow, AdmissionGroup} from '@/types';
import {createClient} from '@/lib/supabase/client';
import {Field} from '../ui/field';

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

    const supabase = createClient();
    let cancelled = false;

    const loadMembers = async () => {
      setLoadingGroup(true);
      setError('');
      const groupResult = await supabase
        .from('groups')
        .select('id,group_name,group_number')
        .eq('id', groupFilter)
        .single();

      if (cancelled) {
        return;
      }

      if (groupResult.error || !groupResult.data) {
        setRows([]);
        setLoadingGroup(false);
        return;
      }

      const memberLinks = await supabase
        .from('group_members')
        .select('member_id,joined_at')
        .eq('group_id', groupFilter)
        .order('joined_at', {ascending: true});

      if (cancelled) {
        return;
      }

      if (memberLinks.error || !memberLinks.data || memberLinks.data.length === 0) {
        setRows([]);
        setLoadingGroup(false);
        return;
      }

      const memberIds = memberLinks.data.map((row) => row.member_id);
      const [membersResult, admissionResult] = await Promise.all([
        supabase
          .from('members')
          .select('id,member_number,full_name,phone')
          .in('id', memberIds),
        supabase
          .from('admission_books')
          .select('member_id,has_book')
          .in('member_id', memberIds)
      ]);

      if (cancelled) {
        return;
      }

      if (membersResult.error || !membersResult.data) {
        setRows([]);
        setLoadingGroup(false);
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
          groupId: groupResult.data.id,
          groupName: groupResult.data.group_name,
          groupNumber: groupResult.data.group_number,
          memberId,
          memberNumber: member?.memberNumber ?? '-',
          fullName: member?.fullName ?? '-',
          phone: member?.phone ?? null,
          hasBook: Boolean(admissionMap.get(memberId))
        };
      });

      setRows(mapped);
      setLoadingGroup(false);
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
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
        <Field label="Search">
          <input
            className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
            placeholder=" "
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <div className="relative">
          <select
            className="peer w-full rounded-lg border bg-background px-3 pt-5 pb-1 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/10"
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
          <label className="pointer-events-none absolute left-3 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
            Filter by Group
          </label>
        </div>
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
