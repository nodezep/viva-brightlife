import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

type UserRole = 'admin' | 'manager' | 'viewer';

const isValidRole = (value: string): value is UserRole =>
  value === 'admin' || value === 'manager' || value === 'viewer';

async function ensureAdmin() {
  const supabase = createClient();
  const {
    data: {user},
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {ok: false as const};
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' || profile?.is_active === false) {
    return {ok: false as const};
  }

  return {ok: true as const, userId: user.id};
}

export async function GET() {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const adminClient = createAdminClient();
  const {data, error} = await adminClient
    .from('profiles')
    .select('id,email,role,is_active,created_at')
    .order('created_at', {ascending: false});

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({users: data ?? []});
}

export async function POST(request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const payload = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    role?: string;
  };

  const email = payload.email?.trim() ?? '';
  const password = payload.password?.trim() ?? '';
  const role = payload.role?.trim() ?? 'viewer';

  if (!email || !password || password.length < 6 || !isValidRole(role)) {
    return NextResponse.json(
      {error: 'Provide email, password (min 6 chars), and valid role.'},
      {status: 400}
    );
  }

  const adminClient = createAdminClient();
  const {data: created, error: createError} =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

  if (createError || !created.user) {
    return NextResponse.json(
      {error: createError?.message || 'Failed to create user'},
      {status: 400}
    );
  }

  const {error: profileError} = await adminClient
    .from('profiles')
    .upsert(
      {id: created.user.id, email: created.user.email, role},
      {onConflict: 'id'}
    );

  if (profileError) {
    return NextResponse.json({error: profileError.message}, {status: 400});
  }

  await adminClient.from('user_audit_logs').insert({
    actor_id: admin.userId,
    target_id: created.user.id,
    action: 'user_created',
    metadata: {email, role}
  });

  return NextResponse.json({
    user: {
      id: created.user.id,
      email: created.user.email,
      role,
      is_active: true,
      created_at: new Date().toISOString()
    }
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const payload = (await request.json().catch(() => ({}))) as {
    userId?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
    action?: 'role' | 'status' | 'password';
  };

  const userId = payload.userId?.trim() ?? '';
  const adminClient = createAdminClient();

  if (!userId) {
    return NextResponse.json({error: 'Provide userId.'}, {status: 400});
  }

  if (payload.action === 'password') {
    const password = payload.password?.trim() ?? '';
    if (!password || password.length < 6) {
      return NextResponse.json(
        {error: 'Provide a new password (min 6 characters).'},
        {status: 400}
      );
    }

    const {error: resetError} = await adminClient.auth.admin.updateUserById(
      userId,
      {password}
    );

    if (resetError) {
      return NextResponse.json({error: resetError.message}, {status: 400});
    }

    await adminClient.from('user_audit_logs').insert({
      actor_id: admin.userId,
      target_id: userId,
      action: 'password_reset',
      metadata: {}
    });

    return NextResponse.json({ok: true});
  }

  if (payload.action === 'status') {
    if (typeof payload.isActive !== 'boolean') {
      return NextResponse.json({error: 'Provide isActive boolean.'}, {status: 400});
    }

    if (userId === admin.userId && payload.isActive === false) {
      return NextResponse.json(
        {error: 'You cannot deactivate your own admin account.'},
        {status: 400}
      );
    }

    const {error} = await adminClient
      .from('profiles')
      .update({is_active: payload.isActive})
      .eq('id', userId);

    if (error) {
      return NextResponse.json({error: error.message}, {status: 400});
    }

    await adminClient.from('user_audit_logs').insert({
      actor_id: admin.userId,
      target_id: userId,
      action: payload.isActive ? 'user_reactivated' : 'user_deactivated',
      metadata: {is_active: payload.isActive}
    });

    return NextResponse.json({ok: true});
  }

  if (payload.action === 'role') {
    const role = payload.role?.trim() ?? '';
    if (!isValidRole(role)) {
      return NextResponse.json({error: 'Provide valid role.'}, {status: 400});
    }

    if (userId === admin.userId && role !== 'admin') {
      return NextResponse.json(
        {error: 'You cannot remove your own admin role.'},
        {status: 400}
      );
    }

    const {error} = await adminClient
      .from('profiles')
      .update({role})
      .eq('id', userId);

    if (error) {
      return NextResponse.json({error: error.message}, {status: 400});
    }

    await adminClient.from('user_audit_logs').insert({
      actor_id: admin.userId,
      target_id: userId,
      action: 'role_changed',
      metadata: {role}
    });

    return NextResponse.json({ok: true});
  }

  return NextResponse.json(
    {error: 'Provide action: role, status, or password.'},
    {status: 400}
  );
}
