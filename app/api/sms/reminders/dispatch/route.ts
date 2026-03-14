import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {dispatchQueuedReminders} from '@/lib/sms/reminders';

async function ensureAdmin() {
  const supabase = createClient();
  const {data: {user}, error: authError} = await supabase.auth.getUser();

  if (authError || !user) {
    return false;
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

export async function POST(request: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const payload = (await request.json().catch(() => ({}))) as {limit?: number};
  const limit = payload.limit && payload.limit > 0 ? payload.limit : 100;

  const result = await dispatchQueuedReminders(limit);
  return NextResponse.json(result);
}