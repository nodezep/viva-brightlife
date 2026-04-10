import {createClient} from '@/lib/supabase/server';
import {ActivityAuditModule} from '@/components/admin/activity-audit-module';

type ActivityLogRow = {
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

const normalizeEndDate = (value: string) => {
  if (!value) {
    return value;
  }
  if (value.includes('T')) {
    return value;
  }
  return `${value}T23:59:59.999Z`;
};

const pickValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

export default async function AuditPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <section className="rounded-2xl border bg-card p-6">
        <h1 className="text-xl font-semibold">Access Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only administrators can view audit logs.
        </p>
      </section>
    );
  }

  const filters: Filters = {
    q: pickValue(searchParams?.q),
    entity: pickValue(searchParams?.entity),
    actor: pickValue(searchParams?.actor),
    from: pickValue(searchParams?.from),
    to: pickValue(searchParams?.to)
  };

  let query = supabase
    .from('activity_logs')
    .select('id,actor_id,action,entity,entity_id,metadata,ip,user_agent,created_at')
    .order('created_at', {ascending: false});

  if (filters.entity) {
    query = query.eq('entity', filters.entity);
  }
  if (filters.actor) {
    query = query.eq('actor_id', filters.actor);
  }
  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('created_at', normalizeEndDate(filters.to));
  }
  if (filters.q) {
    const escaped = filters.q
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/,/g, ' ');
    query = query.or(`action.ilike.%${escaped}%,entity.ilike.%${escaped}%`);
  }

  const {data: logs} = await query.limit(200);

  return (
    <ActivityAuditModule
      initialLogs={(logs ?? []) as ActivityLogRow[]}
      initialFilters={filters}
    />
  );
}
