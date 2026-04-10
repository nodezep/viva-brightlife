import {createClient} from '@/lib/supabase/server';
import {UserManagementModule} from '@/components/admin/user-management-module';

type ProfileRow = {
  id: string;
  email: string | null;
  role: 'admin' | 'manager' | 'viewer';
  is_active: boolean;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_id: string;
  target_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

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

export default async function UsersPage() {
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
          Only administrators can create or manage user accounts.
        </p>
      </section>
    );
  }

  const {data: users} = await supabase
    .from('profiles')
    .select('id,email,role,is_active,created_at')
    .order('created_at', {ascending: false});

  const {data: logs} = await supabase
    .from('user_audit_logs')
    .select('id,actor_id,target_id,action,metadata,created_at')
    .order('created_at', {ascending: false})
    .limit(100);

  const {data: activityLogs} = await supabase
    .from('activity_logs')
    .select('id,actor_id,action,entity,entity_id,metadata,ip,user_agent,created_at')
    .order('created_at', {ascending: false})
    .limit(200);

  return (
    <UserManagementModule
      initialUsers={(users ?? []) as ProfileRow[]}
      initialAuditLogs={(logs ?? []) as AuditLogRow[]}
      initialActivityLogs={(activityLogs ?? []) as ActivityLogRow[]}
    />
  );
}
