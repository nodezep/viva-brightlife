import {SmsRemindersModule} from '@/components/sms/sms-reminders-module';
import {getSmsReminderLogs} from '@/lib/sms/data';

export default async function SmsRemindersPage() {
  const logs = await getSmsReminderLogs(120);
  return <SmsRemindersModule initialLogs={logs} />;
}