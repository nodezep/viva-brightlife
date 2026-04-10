import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {getUpcomingDueReminders} from '@/lib/notifications/upcoming';

export async function GET() {
  const supabase = createClient();
  const {
    data: {user},
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('is_active, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_active === false) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const items = await getUpcomingDueReminders({limit: 5});
  let pendingSmsCount = 0;
  if (profile?.role === 'admin') {
    const {count} = await supabase
      .from('sms_reminders')
      .select('id', {count: 'exact', head: true})
      .eq('status', 'pending_approval');
    pendingSmsCount = count ?? 0;
  }
  return NextResponse.json({items, total: items.length, pendingSmsCount});
}
