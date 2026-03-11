import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {queueOverdueReminders} from '@/lib/sms/reminders';

async function ensureAdmin() {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
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

  const result = await queueOverdueReminders();
  return NextResponse.json(result);
}