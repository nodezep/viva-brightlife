import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';

type Payload = {
  email?: string;
  success?: boolean;
  reason?: string;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as Payload;
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const success = payload.success === true;
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';

  if (!email) {
    return NextResponse.json({ok: false}, {status: 400});
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = request.headers.get('user-agent') ?? null;

  const adminClient = createAdminClient();

  await adminClient.from('activity_logs').insert({
    actor_id: null,
    action: success ? 'login_success' : 'login_failed',
    entity: 'auth',
    entity_id: null,
    metadata: {
      email,
      reason: reason || null
    },
    ip,
    user_agent: userAgent
  });

  return NextResponse.json({ok: true});
}
