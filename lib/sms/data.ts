import {createAdminClient} from '@/lib/supabase/admin';

export type SmsReminderLog = {
  id: string;
  loanId: string;
  memberId: string;
  phone: string;
  reminderKey: string;
  daysOverdue: number;
  status: 'queued' | 'sent' | 'failed' | 'cancelled';
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  scheduledFor: string;
  sentAt: string | null;
  deliveredAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export async function getSmsReminderLogs(limit = 80): Promise<SmsReminderLog[]> {
  try {
    const supabase = createAdminClient();
    const {data, error} = await supabase
      .from('sms_reminders')
      .select(
        'id,loan_id,member_id,phone,reminder_key,days_overdue,status,delivery_status,scheduled_for,sent_at,delivered_at,error_message,created_at'
      )
      .order('created_at', {ascending: false})
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      loanId: row.loan_id,
      memberId: row.member_id,
      phone: row.phone,
      reminderKey: row.reminder_key,
      daysOverdue: row.days_overdue,
      status: row.status,
      deliveryStatus: row.delivery_status,
      scheduledFor: row.scheduled_for,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      errorMessage: row.error_message,
      createdAt: row.created_at
    }));
  } catch {
    return [];
  }
}
