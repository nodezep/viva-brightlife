import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {data: existing} = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from('profiles')
      .insert({id: user.id, email: user.email, role: 'viewer', is_active: true});
  } else {
    await supabase
      .from('profiles')
      .update({email: user.email})
      .eq('id', user.id);
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = request.headers.get('user-agent') ?? null;

  if (existing && existing.is_active === false) {
    try {
      await supabase.from('activity_logs').insert({
        actor_id: user.id,
        action: 'login_blocked',
        entity: 'auth',
        entity_id: null,
        metadata: {reason: 'account_disabled'},
        ip,
        user_agent: userAgent
      });
    } catch {
      // Best-effort logging only.
    }
    return NextResponse.json({error: 'Account disabled'}, {status: 403});
  }

  try {
    await supabase.from('activity_logs').insert({
      actor_id: user.id,
      action: 'login_success',
      entity: 'auth',
      entity_id: null,
      metadata: {email: user.email},
      ip,
      user_agent: userAgent
    });
  } catch {
    // Best-effort logging only.
  }

  return NextResponse.json({
    ok: true,
    profile: {
      role: existing?.role ?? 'viewer',
      is_active: existing?.is_active ?? true
    }
  });
}
