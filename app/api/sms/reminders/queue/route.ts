import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {queueOverdueReminders, queueUpcomingReminders} from '@/lib/sms/reminders';

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

export async function POST() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const [overdue, upcoming] = await Promise.all([
    queueOverdueReminders(),
    queueUpcomingReminders()
  ]);
  return NextResponse.json({
    overdueQueued: overdue.queued ?? 0,
    dueSoonQueued: upcoming.queued ?? 0,
    windowDays: upcoming.windowDays,
    queued: (overdue.queued ?? 0) + (upcoming.queued ?? 0)
  });
}
