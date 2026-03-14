import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const {
    data: {user},
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {data: profile, error} = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json({error: 'Profile not found'}, {status: 404});
  }

  return NextResponse.json({profile});
}
