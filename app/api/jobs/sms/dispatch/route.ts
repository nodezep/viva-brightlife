import {NextRequest, NextResponse} from 'next/server';
import {dispatchQueuedReminders} from '@/lib/sms/reminders';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-job-token');
  if (!process.env.JOB_SECRET || token !== process.env.JOB_SECRET) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const payload = (await request.json().catch(() => ({}))) as {limit?: number};
  const limit = payload.limit && payload.limit > 0 ? payload.limit : 100;

  const result = await dispatchQueuedReminders(limit);
  return NextResponse.json(result);
}