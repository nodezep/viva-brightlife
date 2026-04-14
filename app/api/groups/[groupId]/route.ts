import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  {params}: {params: {groupId: string}}
) {
  const supabase = createClient();
  const {data: {user}, error: authError} = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {count: loanCount, error: loanError} = await supabase
    .from('loans')
    .select('id', {count: 'exact', head: true})
    .eq('group_id', params.groupId);

  if (loanError) {
    return NextResponse.json({error: loanError.message}, {status: 400});
  }

  if ((loanCount ?? 0) > 0) {
    return NextResponse.json(
      {error: 'Cannot delete a group with active loans.'},
      {status: 400}
    );
  }

  const {error: membersError} = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', params.groupId);

  if (membersError) {
    return NextResponse.json({error: membersError.message}, {status: 400});
  }

  const {error: groupError} = await supabase
    .from('groups')
    .delete()
    .eq('id', params.groupId);

  if (groupError) {
    return NextResponse.json({error: groupError.message}, {status: 400});
  }

  return NextResponse.json({ok: true});
}

export async function PATCH(
  request: Request,
  {params}: {params: {groupId: string}}
) {
  const supabase = createClient();
  const {data: {user}, error: authError} = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {groupName, groupNumber} = await request.json();

  if (!groupName || !groupNumber) {
    return NextResponse.json({error: 'Name and Number are required'}, {status: 400});
  }

  const {data, error} = await supabase
    .from('groups')
    .update({group_name: groupName, group_number: groupNumber})
    .eq('id', params.groupId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({group: data});
}
