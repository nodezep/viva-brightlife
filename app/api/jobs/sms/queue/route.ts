import {NextRequest, NextResponse} from 'next/server';
import {queueOverdueReminders, queueUpcomingReminders} from '@/lib/sms/reminders';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-job-token');
  if (!process.env.JOB_SECRET || token !== process.env.JOB_SECRET) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const [overdue, upcoming] = await Promise.all([
    queueOverdueReminders(),
    queueUpcomingReminders()
  ]);
  return NextResponse.json({
    overdueQueued: overdue.queued ?? 0,
    dueSoonQueued: upcoming.queued ?? 0,
    windowDays: upcoming.windowDays,
    queued: (overdue.queued ?? 0) + (upcoming.queued ?? 0)
  });
}
