import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';

const addMemberSchema = z.object({
  memberId: z.string().uuid(),
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

  const {memberId, roleInGroup} = parsed.data;

  const {error} = await supabase.from('group_members').insert({
    group_id: params.groupId,
    member_id: memberId,
    role_in_group: roleInGroup ?? 'Member'
  });

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({ok: true});
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