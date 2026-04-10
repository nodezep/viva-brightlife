'use client';

import {useState} from 'react';
import {usePathname, useRouter} from '@/lib/navigation';

type ActivityLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

type Filters = {
  q: string;
  entity: string;
  actor: string;
  from: string;
  to: string;
};

type Props = {
  initialLogs: ActivityLog[];
  initialFilters: Filters;
};

const entityOptions = [
  {value: '', label: 'All Entities'},
  {value: 'auth', label: 'Auth'},
  {value: 'members', label: 'Members'},
  {value: 'groups', label: 'Groups'},
  {value: 'group_members', label: 'Group Members'},
  {value: 'loans', label: 'Loans'},
  {value: 'loan_schedules', label: 'Loan Schedules'},
  {value: 'repayments', label: 'Repayments'},
  {value: 'insurance_policies', label: 'Insurance Policies'},
  {value: 'admission_books', label: 'Admission Books'}
];

const emptyFilters: Filters = {
  q: '',
  entity: '',
  actor: '',
  from: '',
  to: ''
};

export function ActivityAuditModule({initialLogs, initialFilters}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildParams = (nextFilters: Filters) => {
    const params = new URLSearchParams();
    if (nextFilters.q) params.set('q', nextFilters.q);
    if (nextFilters.entity) params.set('entity', nextFilters.entity);
    if (nextFilters.actor) params.set('actor', nextFilters.actor);
    if (nextFilters.from) params.set('from', nextFilters.from);
    if (nextFilters.to) params.set('to', nextFilters.to);
    return params;
  };

  const fetchLogs = async (nextFilters: Filters) => {
    setLoading(true);
    setError('');
    const params = buildParams(nextFilters);
    const url = params.toString()
      ? `/api/admin/activity/audit?${params.toString()}`
      : '/api/admin/activity/audit';

    const response = await fetch(url);
    if (!response.ok) {
      setError('Failed to load activity logs.');
      setLoading(false);
      return;
    }

    const result = await response.json();
    setLogs((result.logs ?? []) as ActivityLog[]);
    setLoading(false);
  };

  const applyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = buildParams(filters);
    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl);
    await fetchLogs(filters);
  };

  const clearFilters = async () => {
    setFilters(emptyFilters);
    router.replace(pathname);
    await fetchLogs(emptyFilters);
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit & Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Track critical actions across the system. Search matches action or entity.
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-6"
      >
        <div className="md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Search
          </label>
          <input
            type="text"
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Action or entity..."
            value={filters.q}
            onChange={(event) =>
              setFilters((current) => ({...current, q: event.target.value}))
            }
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Entity
          </label>
          <select
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={filters.entity}
            onChange={(event) =>
              setFilters((current) => ({...current, entity: event.target.value}))
            }
          >
            {entityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Actor ID
          </label>
          <input
            type="text"
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="User UUID"
            value={filters.actor}
            onChange={(event) =>
              setFilters((current) => ({...current, actor: event.target.value}))
            }
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            From
          </label>
          <input
            type="date"
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={filters.from}
            onChange={(event) =>
              setFilters((current) => ({...current, from: event.target.value}))
            }
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            To
          </label>
          <input
            type="date"
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={filters.to}
            onChange={(event) =>
              setFilters((current) => ({...current, to: event.target.value}))
            }
          />
        </div>
        <div className="md:col-span-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? 'Applying...' : 'Apply Filters'}
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            onClick={clearFilters}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            onClick={() => void fetchLogs(filters)}
          >
            Refresh
          </button>
        </div>
        {error ? (
          <p className="md:col-span-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </form>

      <section className="rounded-2xl border bg-card p-4">
        <div className="overflow-x-auto">
          <table className="min-w-[950px] w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">
                    {log.created_at ? log.created_at.replace('T', ' ').slice(0, 19) : '-'}
                  </td>
                  <td className="px-3 py-2">{log.actor_id ?? '-'}</td>
                  <td className="px-3 py-2">{log.entity}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.entity_id ?? '-'}</td>
                  <td className="px-3 py-2">
                    {log.metadata ? JSON.stringify(log.metadata) : '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                    No activity logs found for these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
