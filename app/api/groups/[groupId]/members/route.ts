import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';

const addMemberSchema = z
  .object({
    memberId: z.string().uuid().optional(),
    memberNumber: z.string().optional(),
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    roleInGroup: z.string().optional()
  })
  .refine((data) => data.memberId || data.fullName, {
    message: 'Provide memberId or member details.'
  });

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  memberNumber: z.string().optional(),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  roleInGroup: z.string().optional()
});

export async function POST(
  request: NextRequest,
  {params}: {params: {groupId: string}}
) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const parsed = addMemberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  const {memberId, memberNumber, fullName, phone, roleInGroup} = parsed.data;
  let resolvedMemberId = memberId ?? '';

  const normalizePhone = (value?: string) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  const normalizeRole = (value?: string) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  if (!resolvedMemberId && fullName) {
    const insertData: any = {
      full_name: fullName,
      phone: normalizePhone(phone)
    };
    if (memberNumber && memberNumber.trim() !== '') {
      insertData.member_number = memberNumber.trim();
    }

    const {data: newMember, error: memberError} = await supabase
      .from('members')
      .insert(insertData)
      .select('id')
      .single();

    if (memberError || !newMember) {
      return NextResponse.json(
        {error: memberError?.message ?? 'Failed to create member'},
        {status: 400}
      );
    }

    resolvedMemberId = newMember.id;
  }

  if (!resolvedMemberId) {
    return NextResponse.json(
      {error: 'Member details are required.'},
      {status: 400}
    );
  }

  if (memberId && !fullName) {
    const {data: existingMember, error: existingError} = await supabase
      .from('members')
      .select('id')
      .eq('id', memberId)
      .single();

    if (existingError) {
      return NextResponse.json({error: existingError.message}, {status: 400});
    }

    resolvedMemberId = existingMember?.id ?? '';
  }

  const {error} = await supabase.from('group_members').insert({
    group_id: params.groupId,
    member_id: resolvedMemberId,
    role_in_group: normalizeRole(roleInGroup) ?? 'Member'
  });

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  const {data: memberRow} = await supabase
    .from('members')
    .select('id,member_number,full_name,phone')
    .eq('id', resolvedMemberId)
    .single();

  return NextResponse.json({
    ok: true,
    member: memberRow ?? null
  });
}

export async function PUT(
  request: NextRequest,
  {params}: {params: {groupId: string}}
) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const parsed = updateMemberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  const {memberId, memberNumber, fullName, phone, roleInGroup} = parsed.data;
  const normalizedPhone = phone?.trim() ? phone.trim() : null;
  const normalizedRole = roleInGroup?.trim() ? roleInGroup.trim() : null;

  const updateData: any = {full_name: fullName, phone: normalizedPhone};
  if (memberNumber !== undefined) {
    updateData.member_number = memberNumber.trim() ? memberNumber.trim() : null;
  }

  const {error: memberError} = await supabase
    .from('members')
    .update(updateData)
    .eq('id', memberId);

  if (memberError) {
    return NextResponse.json({error: memberError.message}, {status: 400});
  }

  const {error: roleError} = await supabase
    .from('group_members')
    .update({role_in_group: normalizedRole})
    .eq('group_id', params.groupId)
    .eq('member_id', memberId);

  if (roleError) {
    return NextResponse.json({error: roleError.message}, {status: 400});
  }

  const {data: memberRow} = await supabase
    .from('members')
    .select('id,member_number,full_name,phone')
    .eq('id', memberId)
    .single();

  return NextResponse.json({
    ok: true,
    member: memberRow ?? null,
    roleInGroup: normalizedRole
  });
}

export async function DELETE(
  request: NextRequest,
  {params}: {params: {groupId: string}}
) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const memberId = request.nextUrl.searchParams.get('memberId');
  if (!memberId) {
    return NextResponse.json({error: 'memberId is required'}, {status: 400});
  }

  const {error} = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', params.groupId)
    .eq('member_id', memberId);

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({ok: true});
}
