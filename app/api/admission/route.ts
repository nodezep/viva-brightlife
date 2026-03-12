import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json().catch(() => null);
  const memberId = body?.memberId as string | undefined;
  const hasBook = Boolean(body?.hasBook);

  if (!memberId) {
    return NextResponse.json({error: 'memberId is required'}, {status: 400});
  }

  const {error} = await supabase
    .from('admission_books')
    .upsert(
      {member_id: memberId, has_book: hasBook, checked_at: new Date().toISOString()},
      {onConflict: 'member_id'}
    );

  if (error) {
    return NextResponse.json({error: error.message}, {status: 400});
  }

  return NextResponse.json({success: true});
}
