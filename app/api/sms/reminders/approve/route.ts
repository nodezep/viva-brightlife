import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

async function ensureAdmin() {
  const supabase = createClient();
  const {data: {user}, error: authError} = await supabase.auth.getUser();

  if (authError || !user) {
    return {ok: false, userId: ''};
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return {ok: false, userId: ''};
  }

  return {ok: true, userId: user.id};
}

export async function POST(request: NextRequest) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const payload = (await request.json().catch(() => ({}))) as {
    ids?: string[];
    approveAll?: boolean;
    reject?: boolean;
  };

  const supabase = createClient();

  // ── Reject path ────────────────────────────────────────────────────────────
  if (payload.reject) {
    const ids = payload.ids ?? [];
    if (ids.length === 0) {
      return NextResponse.json({error: 'No reminder ids provided'}, {status: 400});
    }
    const {data, error} = await supabase
      .from('sms_reminders')
      .update({
        status: 'cancelled',
        delivery_status: 'cancelled',
        approved_by: auth.userId,
        approved_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('status', 'pending_approval')
      .select('id');

    if (error) {
      return NextResponse.json({error: error.message}, {status: 400});
    }
    return NextResponse.json({rejected: data?.length ?? 0});
  }

  // ── Approve path ───────────────────────────────────────────────────────────
  const approvalUpdate = {
    status: 'queued',
    approved_by: auth.userId,
    approved_at: new Date().toISOString()
  };

  if (payload.approveAll) {
    const {data, error} = await supabase
      .from('sms_reminders')
      .update(approvalUpdate)
      .eq('status', 'pending_approval')
      .select('id');

    if (error) {
      return NextResponse.json({error: error.message}, {status: 400});
    }

    return NextResponse.json({approved: data?.length ?? 0});
  }

  const ids = payload.ids ?? [];
  if (ids.length === 0) {
    return NextResponse.json({error: 'No reminder ids provided'}, {status: 400});
  }

  const {data, error} = await supabase
    .from('sms_reminders')
    .update(approvalUpdate)
    .in('id', ids)
    .eq('status', 'pending_approval')
    .select('id');

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({approved: data?.length ?? 0});
}
