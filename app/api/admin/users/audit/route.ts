import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

async function ensureAdmin() {
  const supabase = createClient();
  const {
    data: {user},
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {ok: false as const};
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' || profile?.is_active === false) {
    return {ok: false as const};
  }

  return {ok: true as const};
}

export async function GET() {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const adminClient = createAdminClient();
  const {data, error} = await adminClient
    .from('user_audit_logs')
    .select('id,actor_id,target_id,action,metadata,created_at')
    .order('created_at', {ascending: false})
    .limit(100);

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({logs: data ?? []});
}
