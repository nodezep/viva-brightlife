import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {sendSms} from '@/lib/sms/provider';

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

export async function POST(request: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const payload = (await request.json()) as {phone?: string; message?: string};

  if (!payload.phone || !payload.message) {
    return NextResponse.json(
      {error: 'phone and message are required'},
      {status: 400}
    );
  }

  const result = await sendSms(payload.phone, payload.message);

  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: 400});
  }

  return NextResponse.json({ok: true, providerMessageId: result.providerMessageId});
}