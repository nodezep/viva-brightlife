'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useLocale} from 'next-intl';
import type {UpcomingDueReminder} from '@/lib/notifications/upcoming';

type SummaryResponse = {
  items: UpcomingDueReminder[];
  total: number;
};

export function NotificationsPopout() {
  const locale = useLocale();
  const [items, setItems] = useState<UpcomingDueReminder[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/notifications/summary');
        if (!response.ok) return;
        const payload = (await response.json()) as SummaryResponse;
        if (!active) return;
        setItems(payload.items ?? []);
      } catch {
        if (!active) return;
        setItems([]);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (!open || items.length === 0) {
    return null;
  }

  const statusPill = (status: string) => {
    if (status === 'delivered') return 'bg-emerald-100 text-emerald-800';
    if (status === 'sent') return 'bg-green-100 text-green-800';
    if (status === 'failed') return 'bg-red-100 text-red-800';
    if (status === 'queued') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="fixed right-4 top-20 z-50 w-full max-w-sm">
      <div className="rounded-2xl border bg-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Notifications
            </p>
            <h2 className="mt-1 text-sm font-semibold">Upcoming repayments</h2>
          </div>
          <button
            className="rounded-full border px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.scheduleId}
              className="rounded-lg border bg-background px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{item.memberName}</span>
                <span className={`rounded px-2 py-0.5 ${statusPill(item.reminderStatus)}`}>
                  {item.reminderStatus === 'not_scheduled'
                    ? 'not scheduled'
                    : item.reminderStatus}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Loan {item.loanNumber} due {item.expectedDate}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 text-right">
          <Link
            href={`/${locale}/sms-reminders`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View SMS reminders
          </Link>
        </div>
      </div>
    </div>
  );
}
