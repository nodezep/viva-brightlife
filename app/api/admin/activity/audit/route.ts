import {NextRequest, NextResponse} from 'next/server';
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

const normalizeEndDate = (value: string) => {
  if (!value) {
    return value;
  }
  if (value.includes('T')) {
    return value;
  }
  return `${value}T23:59:59.999Z`;
};

export async function GET(request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {searchParams} = new URL(request.url);
  const entity = searchParams.get('entity')?.trim() ?? '';
  const actor = searchParams.get('actor')?.trim() ?? '';
  const query = searchParams.get('q')?.trim() ?? '';
  const from = searchParams.get('from')?.trim() ?? '';
  const to = searchParams.get('to')?.trim() ?? '';

  const adminClient = createAdminClient();
  let dbQuery = adminClient
    .from('activity_logs')
    .select('id,actor_id,action,entity,entity_id,metadata,ip,user_agent,created_at')
    .order('created_at', {ascending: false});

  if (entity) {
    dbQuery = dbQuery.eq('entity', entity);
  }
  if (actor) {
    dbQuery = dbQuery.eq('actor_id', actor);
  }
  if (from) {
    dbQuery = dbQuery.gte('created_at', from);
  }
  if (to) {
    dbQuery = dbQuery.lte('created_at', normalizeEndDate(to));
  }
  if (query) {
    const escaped = query
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/,/g, ' ');
    dbQuery = dbQuery.or(`action.ilike.%${escaped}%,entity.ilike.%${escaped}%`);
  }

  const {data, error} = await dbQuery.limit(200);

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({logs: data ?? []});
}
