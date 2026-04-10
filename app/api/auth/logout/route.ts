import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (user) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const userAgent = request.headers.get('user-agent') ?? null;
    try {
      await supabase.from('activity_logs').insert({
        actor_id: user.id,
        action: 'logout',
        entity: 'auth',
        entity_id: null,
        metadata: {email: user.email},
        ip,
        user_agent: userAgent
      });
    } catch {
      // Best-effort logging only.
    }
  }
  await supabase.auth.signOut();
  return NextResponse.json({ok: true});
}
