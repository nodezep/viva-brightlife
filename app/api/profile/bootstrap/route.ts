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

  if (existing && existing.is_active === false) {
    return NextResponse.json({error: 'Account disabled'}, {status: 403});
  }

  return NextResponse.json({
    ok: true,
    profile: {
      role: existing?.role ?? 'viewer',
      is_active: existing?.is_active ?? true
    }
  });
}
