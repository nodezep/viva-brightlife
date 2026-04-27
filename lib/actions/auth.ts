'use server';

import {createClient} from '@/lib/supabase/server';
import {headers} from 'next/headers';

export async function logAutoLogout() {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (user) {
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const userAgent = headersList.get('user-agent') ?? null;

    try {
      await supabase.from('activity_logs').insert({
        actor_id: user.id,
        action: 'auto_logout',
        entity: 'auth',
        entity_id: null,
        metadata: {email: user.email, reason: 'inactivity'},
        ip,
        user_agent: userAgent
      });
    } catch (err) {
      console.error('Failed to log auto logout:', err);
    }
  }
}
