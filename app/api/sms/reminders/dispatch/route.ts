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

  const supabase = createClient();
  const {count: pendingCount} = await supabase
    .from('sms_reminders')
    .select('id', {count: 'exact', head: true})
    .eq('status', 'pending_approval');
  if ((pendingCount ?? 0) > 0) {
    return NextResponse.json(
      {error: 'Pending approvals exist. Please approve before dispatching.'},
      {status: 400}
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {limit?: number};
  const limit = payload.limit && payload.limit > 0 ? payload.limit : 100;

  const result = await dispatchQueuedReminders(limit);
  return NextResponse.json(result);
}
