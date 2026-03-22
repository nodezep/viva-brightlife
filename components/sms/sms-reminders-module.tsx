'use client';

import {useState} from 'react';
import type {SmsReminderLog} from '@/lib/sms/data';
import type {UpcomingDueReminder} from '@/lib/notifications/upcoming';

type Props = {
  initialLogs: SmsReminderLog[];
  upcomingDue: UpcomingDueReminder[];
};

export function SmsRemindersModule({initialLogs, upcomingDue}: Props) {
  const [logs] = useState(initialLogs);
  const [dueSoon] = useState(upcomingDue);
  const [busy, setBusy] = useState<'queue' | 'dispatch' | 'test' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Malipo yako yamechelewa, tafadhali lipa leo.');

  const queueNow = async () => {
    setBusy('queue');
    setStatusMessage('');
    const response = await fetch('/api/sms/reminders/queue', {method: 'POST'});
    const result = await response.json();
    if (!response.ok) {
      setStatusMessage(result.error ?? 'Queue job failed');
      setBusy(null);
      return;
    }
    const overdue = result.overdueQueued ?? 0;
    const dueSoonCount = result.dueSoonQueued ?? 0;
    const total = result.queued ?? overdue + dueSoonCount;
    const windowDays = result.windowDays ? ` (next ${result.windowDays} days)` : '';
    setStatusMessage(
      `Queued reminders: ${total} (overdue: ${overdue}, due soon: ${dueSoonCount}${windowDays})`
    );
    setBusy(null);
    window.location.reload();
  };

  const dispatchNow = async () => {
    setBusy('dispatch');
    setStatusMessage('');
    const response = await fetch('/api/sms/reminders/dispatch', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({limit: 100})
    });
    const result = await response.json();
    if (!response.ok) {
      setStatusMessage(result.error ?? 'Dispatch job failed');
      setBusy(null);
      return;
    }
    setStatusMessage(`Sent: ${result.sent}, Failed: ${result.failed}`);
    setBusy(null);
    window.location.reload();
  };

  const sendTestSms = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('test');
    setStatusMessage('');

    const response = await fetch('/api/sms/reminders/test', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({phone, message})
    });
    const result = await response.json();
    if (!response.ok) {
      setStatusMessage(result.error ?? 'Test SMS failed');
      setBusy(null);
      return;
    }

    setStatusMessage(`Test SMS sent. Provider message ID: ${result.providerMessageId}`);
    setBusy(null);
  };

  const statusPill = (status: string) => {
    if (status === 'delivered') return 'bg-emerald-100 text-emerald-800';
    if (status === 'sent') return 'bg-green-100 text-green-800';
    if (status === 'failed') return 'bg-red-100 text-red-800';
    if (status === 'queued') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">SMS Reminders</h1>

      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
        <button
          onClick={queueNow}
          disabled={busy !== null}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy === 'queue' ? 'Queueing...' : 'Queue Due + Overdue Reminders'}
        </button>
        <button
          onClick={dispatchNow}
          disabled={busy !== null}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
        >
          {busy === 'dispatch' ? 'Dispatching...' : 'Dispatch Queued SMS'}
        </button>
      </div>

      <form onSubmit={sendTestSms} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Phone e.g. +2557XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
        >
          {busy === 'test' ? 'Sending...' : 'Send Test SMS'}
        </button>
      </form>

      {statusMessage ? (
        <p className="rounded-lg border bg-muted px-3 py-2 text-sm">{statusMessage}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">Due Date</th>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Loan</th>
              <th className="px-3 py-2">Amount Due</th>
              <th className="px-3 py-2">Days Until</th>
              <th className="px-3 py-2">SMS Status</th>
              <th className="px-3 py-2">Scheduled For</th>
            </tr>
          </thead>
          <tbody>
            {dueSoon.map((row) => (
              <tr key={row.scheduleId} className="border-t">
                <td className="px-3 py-2">{row.expectedDate}</td>
                <td className="px-3 py-2">{row.memberName}</td>
                <td className="px-3 py-2">{row.phone ?? '-'}</td>
                <td className="px-3 py-2">{row.loanNumber}</td>
                <td className="px-3 py-2">{row.amountDue.toLocaleString()}</td>
                <td className="px-3 py-2">{row.daysUntil}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-1 text-xs ${statusPill(row.reminderStatus)}`}>
                    {row.reminderStatus === 'not_scheduled' ? 'not scheduled' : row.reminderStatus}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {row.reminderScheduledFor
                    ? new Date(row.reminderScheduledFor).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))}
            {dueSoon.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                  No upcoming due payments in the selected window.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Rule</th>
              <th className="px-3 py-2">Days Overdue</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Queue Status</th>
              <th className="px-3 py-2">Delivery Status</th>
              <th className="px-3 py-2">Delivered At</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{log.phone}</td>
                <td className="px-3 py-2">{log.reminderKey}</td>
                <td className="px-3 py-2">{log.daysOverdue}</td>
                <td className="px-3 py-2">{new Date(log.scheduledFor).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-1 text-xs ${statusPill(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-1 text-xs ${statusPill(log.deliveryStatus)}`}>
                    {log.deliveryStatus}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {log.deliveredAt ? new Date(log.deliveredAt).toLocaleString() : '-'}
                </td>
                <td className="px-3 py-2">{log.errorMessage ?? '-'}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={9}>
                  No reminder logs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
