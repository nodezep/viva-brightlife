import {NextRequest, NextResponse} from 'next/server';
import {queueOverdueReminders} from '@/lib/sms/reminders';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-job-token');
  if (!process.env.JOB_SECRET || token !== process.env.JOB_SECRET) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const result = await queueOverdueReminders();
  return NextResponse.json(result);
}