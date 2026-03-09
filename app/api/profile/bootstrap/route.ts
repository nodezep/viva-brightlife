import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  await supabase
    .from('profiles')
    .upsert({id: user.id, email: user.email, role: 'admin'}, {onConflict: 'id'});

  return NextResponse.json({ok: true});
}