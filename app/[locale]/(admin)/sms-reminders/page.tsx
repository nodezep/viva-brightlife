import {SmsRemindersModule} from '@/components/sms/sms-reminders-module';
import {getPendingSmsReminders, getSmsReminderLogs} from '@/lib/sms/data';
import {getUpcomingDueReminders} from '@/lib/notifications/upcoming';

export default async function SmsRemindersPage() {
  const [logs, upcoming, pending] = await Promise.all([
    getSmsReminderLogs(120),
    getUpcomingDueReminders({limit: 80}),
    getPendingSmsReminders(200)
  ]);
  return (
    <SmsRemindersModule
      initialLogs={logs}
      upcomingDue={upcoming}
      pendingApprovals={pending}
    />
  );
}
