import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';

const createGroupSchema = z.object({
  groupName: z.string().min(2),
  groupNumber: z.string().min(2),
  groupType: z.string().min(2)
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const payload = await request.json();
  const parsed = createGroupSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  const {groupName, groupNumber, groupType} = parsed.data;

  const {data, error} = await supabase
    .from('groups')
    .insert({
      group_name: groupName,
      group_number: groupNumber,
      group_type: groupType
    })
    .select('id,group_name,group_number,group_type,created_at')
    .single();

  if (error || !data) {
    return NextResponse.json(
      {error: error?.message ?? 'Failed to create group'},
      {status: 400}
    );
  }

  return NextResponse.json({group: data});
}