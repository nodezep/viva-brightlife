import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({error: 'groupId is required'}, {status: 400});
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = createClient();
  }

  const primary = await supabase
    .from('group_members')
    .select(
      'group_id,groups(group_name,group_number),members(id,member_number,full_name,phone,admission_books(has_book))'
    )
    .eq('group_id', groupId)
    .order('created_at', {ascending: true});

  if (primary.error || !primary.data) {
    const fallback = await supabase
      .from('group_members')
      .select('group_id,groups(group_name,group_number),members(id,member_number,full_name,phone)')
      .eq('group_id', groupId)
      .order('created_at', {ascending: true});

    if (fallback.error || !fallback.data) {
      return NextResponse.json({rows: []});
    }

    const rows = (fallback.data as unknown as Array<{
      group_id: string;
      groups: {group_name: string; group_number: string} | null;
      members:
        | {id: string; member_number: string; full_name: string; phone: string | null}
        | null;
    }>).map((row) => ({
      groupId: row.group_id,
      groupName: row.groups?.group_name ?? '-',
      groupNumber: row.groups?.group_number ?? '-',
      memberId: row.members?.id ?? '',
      memberNumber: row.members?.member_number ?? '-',
      fullName: row.members?.full_name ?? '-',
      phone: row.members?.phone ?? null,
      hasBook: false
    }));

    return NextResponse.json({rows});
  }

  const rows = (primary.data as unknown as Array<{
    group_id: string;
    groups: {group_name: string; group_number: string} | null;
    members:
      | {id: string; member_number: string; full_name: string; phone: string | null; admission_books?: {has_book: boolean}[] | null}
      | null;
  }>).map((row) => ({
    groupId: row.group_id,
    groupName: row.groups?.group_name ?? '-',
    groupNumber: row.groups?.group_number ?? '-',
    memberId: row.members?.id ?? '',
    memberNumber: row.members?.member_number ?? '-',
    fullName: row.members?.full_name ?? '-',
    phone: row.members?.phone ?? null,
    hasBook: Boolean(row.members?.admission_books?.[0]?.has_book)
  }));

  return NextResponse.json({rows});
}
