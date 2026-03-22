import {SmsRemindersModule} from '@/components/sms/sms-reminders-module';
import {getSmsReminderLogs} from '@/lib/sms/data';
import {getUpcomingDueReminders} from '@/lib/notifications/upcoming';

export default async function SmsRemindersPage() {
  const [logs, upcoming] = await Promise.all([
    getSmsReminderLogs(120),
    getUpcomingDueReminders({limit: 80})
  ]);
  return <SmsRemindersModule initialLogs={logs} upcomingDue={upcoming} />;
}
