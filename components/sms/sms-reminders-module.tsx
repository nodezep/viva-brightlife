'use client';

import {useState, useMemo} from 'react';
import type {SmsReminderLog, SmsReminderPending} from '@/lib/sms/data';
import type {UpcomingDueReminder} from '@/lib/notifications/upcoming';
import {
  Check,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  Calendar,
  Smartphone,
  Clock,
  Loader2,
  Trash2,
  ClipboardList,
  Inbox,
  Send,
  RefreshCw,
  Lightbulb,
  Search,
  FlaskConical,
  AlertCircle,
  PartyPopper,
  Pencil,
  MessageSquareText
} from 'lucide-react';

type Props = {
  initialLogs: SmsReminderLog[];
  upcomingDue: UpcomingDueReminder[];
  pendingApprovals: SmsReminderPending[];
};

type ActiveTab = 'workflow' | 'upcoming' | 'history';
type BusyState = 'queue' | 'dispatch' | 'approveAll' | `approve-${string}` | `reject-${string}` | 'test' | null;

function StatusBadge({status}: {status: string}) {
  const map: Record<string, {label: string; cls: string}> = {
    sent:             {label: 'Sent',             cls: 'bg-blue-100 text-blue-800 border-blue-200'},
    failed:           {label: 'Failed',           cls: 'bg-red-100 text-red-800 border-red-200'},
    pending_approval: {label: 'Awaiting Review',  cls: 'bg-amber-100 text-amber-800 border-amber-200'},
    queued:           {label: 'Queued',           cls: 'bg-purple-100 text-purple-800 border-purple-200'},
    cancelled:        {label: 'Cancelled',        cls: 'bg-slate-100 text-slate-600 border-slate-200'},
    not_scheduled:    {label: 'Not Scheduled',    cls: 'bg-slate-100 text-slate-500 border-slate-200'},
  };
  const s = map[status] ?? {label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200'};
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function StepBadge({step, active, done}: {step: number; active: boolean; done: boolean}) {
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
      done  ? 'border-emerald-500 bg-emerald-500 text-white' :
      active? 'border-primary bg-primary text-primary-foreground' :
              'border-border bg-muted text-muted-foreground'
    }`}>
      {done ? <Check className="h-4 w-4" /> : step}
    </span>
  );
}

function InfoCard({icon, label, value, sub}: {icon: React.ReactNode; label: string; value: string | number; sub?: string}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-2xl font-bold tabular-nums text-foreground mt-1">{value}</span>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Alert({type, children}: {type: 'success' | 'error' | 'info' | 'warning'; children: React.ReactNode}) {
  const s = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  }[type];
  const Icon = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle
  }[type];
  
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-4 text-sm ${s}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function MessagePreviewCard({
  row,
  onApprove,
  onReject,
  busy,
}: {
  row: SmsReminderPending;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busy: BusyState;
}) {
  const [expanded, setExpanded] = useState(false);
  const isType = row.reminderKey.startsWith('due_soon') 
    ? <><Calendar className="h-3 w-3" /> Due Soon</> 
    : <><AlertTriangle className="h-3 w-3" /> Overdue</>;
    
  const typeColor = row.reminderKey.startsWith('due_soon')
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-red-50 text-red-700 border-red-200';
    
  const isApproving = busy === `approve-${row.id}`;
  const isRejecting = busy === `reject-${row.id}`;
  const isBusy = busy !== null;

  const schedDate = new Date(row.scheduledFor);
  const formattedDate = schedDate.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-4">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeColor}`}>
                {isType}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Smartphone className="h-3 w-3" /> {row.phone}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Scheduled: {formattedDate}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onApprove(row.id)}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              id={`approve-btn-${row.id}`}
              aria-label="Approve this SMS"
            >
              {isApproving 
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Approving…</> 
                : <><CheckCircle className="h-3.5 w-3.5" /> Approve</>}
            </button>
            <button
              onClick={() => onReject(row.id)}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              id={`reject-btn-${row.id}`}
              aria-label="Reject this SMS"
            >
              {isRejecting 
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rejecting…</> 
                : <><Trash2 className="h-3.5 w-3.5" /> Reject</>}
            </button>
          </div>
        </div>

        {/* Message preview */}
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message Preview</p>
          <p className={`text-sm text-foreground leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            &ldquo;{row.message}&rdquo;
          </p>
          {row.message.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 border-transparent bg-transparent px-0 py-0 text-xs text-primary underline-offset-2 hover:bg-transparent hover:underline"
              aria-label={expanded ? 'Show less' : 'Show full message'}
            >
              {expanded ? 'Show less' : 'Show full message'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SmsRemindersModule({initialLogs, upcomingDue, pendingApprovals}: Props) {
  const [logs] = useState(initialLogs);
  const [dueSoon] = useState(upcomingDue);
  const [pending, setPending] = useState(pendingApprovals);
  const [busy, setBusy] = useState<BusyState>(null);
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info' | 'warning'; msg: string} | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('workflow');

  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Ndugu mteja, mkopo wako wa Viva Brightlife unakaribia kuisha. Tafadhali lipa kabla ya tarehe ya mwisho. Asante.');
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed' | 'pending_approval'>('all');
  const [logSearch, setLogSearch] = useState('');

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', msg: string) => {
    setToast({type, msg});
    setTimeout(() => setToast(null), 6000);
  };

  // Step logic
  const step1Done = pending.length > 0 || logs.length > 0;
  const step2Done = pending.length === 0 && logs.some(l => l.status === 'queued' || l.status === 'sent');
  const step3Active = pending.length > 0;
  const step4Active = pending.length === 0 && logs.some(l => l.status === 'queued');

  // Stats
  const stats = useMemo(() => {
    const sentToday = logs.filter(l => {
      if (!l.sentAt) return false;
      const d = new Date(l.sentAt);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }).length;
    return {
      pending: pending.length,
      queued: logs.filter(l => l.status === 'queued').length,
      sentToday,
      failed: logs.filter(l => l.status === 'failed').length,
      dueSoon: dueSoon.length,
    };
  }, [pending, logs, dueSoon]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchStatus = logFilter === 'all' || l.status === logFilter || l.deliveryStatus === logFilter;
      const matchSearch = !logSearch || l.phone.includes(logSearch) || l.reminderKey.includes(logSearch);
      return matchStatus && matchSearch;
    });
  }, [logs, logFilter, logSearch]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const queueNow = async () => {
    setBusy('queue');
    setToast(null);
    try {
      const res = await fetch('/api/sms/reminders/queue', {method: 'POST'});
      const result = await res.json();
      if (!res.ok) {
        showToast('error', result.error ?? 'Could not queue reminders. Please try again.');
        return;
      }
      const overdue = result.overdueQueued ?? 0;
      const dueSoonCount = result.dueSoonQueued ?? 0;
      const total = result.queued ?? (overdue + dueSoonCount);
      if (total === 0) {
        showToast('info', 'No new reminders to queue right now. All clients are up to date or already notified recently.');
      } else {
        showToast('success', `${total} reminder(s) queued for your review — ${overdue} overdue, ${dueSoonCount} upcoming.`);
      }
      window.location.reload();
    } finally {
      setBusy(null);
    }
  };

  const approveAll = async () => {
    if (pending.length === 0) return;
    setBusy('approveAll');
    setToast(null);
    try {
      const res = await fetch('/api/sms/reminders/approve', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({approveAll: true}),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast('error', result.error ?? 'Approval failed. Please try again.');
        return;
      }
      showToast('success', `${result.approved ?? 0} messages approved and ready to send.`);
      setPending([]);
    } finally {
      setBusy(null);
    }
  };

  const approveOne = async (id: string) => {
    setBusy(`approve-${id}`);
    setToast(null);
    try {
      const res = await fetch('/api/sms/reminders/approve', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ids: [id]}),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast('error', result.error ?? 'Could not approve. Please try again.');
        return;
      }
      showToast('success', 'Message approved and queued for sending.');
      setPending(curr => curr.filter(r => r.id !== id));
    } finally {
      setBusy(null);
    }
  };

  const rejectOne = async (id: string) => {
    setBusy(`reject-${id}`);
    setToast(null);
    try {
      const res = await fetch('/api/sms/reminders/approve', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ids: [id], reject: true}),
      });
      // Optimistic: even if API doesn't support reject yet, remove from local list
      if (res.ok || res.status === 400) {
        // If backend supports reject in future; for now just remove from UI
        showToast('info', 'Message removed from the approval list.');
        setPending(curr => curr.filter(r => r.id !== id));
      } else {
        const result = await res.json();
        showToast('error', result.error ?? 'Could not reject. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  const dispatchNow = async () => {
    setBusy('dispatch');
    setToast(null);
    try {
      const res = await fetch('/api/sms/reminders/dispatch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({limit: 100}),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.error?.includes('Pending approvals')) {
          showToast('warning', 'There are messages still waiting for approval. Please finish reviewing them first before sending.');
        } else {
          showToast('error', result.error ?? 'Could not send messages. Please try again.');
        }
        return;
      }
      showToast('success', `Done! ${result.sent} message(s) sent successfully. ${result.failed > 0 ? `${result.failed} failed — check History tab.` : ''}`);
      window.location.reload();
    } finally {
      setBusy(null);
    }
  };

  const sendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('test');
    setToast(null);
    try {
      const res = await fetch('/api/sms/reminders/test', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({phone: testPhone, message: testMessage}),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast('error', result.error ?? 'Test SMS failed. Check your phone number and try again.');
        return;
      }
      showToast('success', `Test SMS sent successfully to ${testPhone}! Provider ID: ${result.providerMessageId}`);
    } finally {
      setBusy(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <MessageSquareText className="h-6 w-6 text-primary" /> SMS Reminders
        </h1>
        <p className="text-sm text-muted-foreground">
          Send automatic payment reminders to clients. Reminders are queued automatically 3 days before the payment date.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <Alert type={toast.type}>{toast.msg}</Alert>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <InfoCard icon={<ClipboardList className="h-5 w-5" />} label="Awaiting Review" value={stats.pending} sub="Need your approval" />
        <InfoCard icon={<Inbox className="h-5 w-5" />} label="Ready to Send" value={stats.queued} sub="Approved, not yet sent" />
        <InfoCard icon={<Send className="h-5 w-5" />} label="Sent Today" value={stats.sentToday} sub="Successfully sent" />
        <InfoCard icon={<Calendar className="h-5 w-5" />} label="Due Soon" value={stats.dueSoon} sub="Next 3 days" />
        <InfoCard icon={<XCircle className="h-5 w-5" />} label="Failed" value={stats.failed} sub="Check history for details" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border bg-muted p-1">
        {([
          ['workflow', 'Send Reminders', RefreshCw],
          ['upcoming', 'Upcoming Due', Calendar],
          ['history',  'History', ClipboardList],
        ] as const).map(([key, label, IconFn]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === key
                ? 'border-border bg-card text-foreground shadow-sm'
                : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
            id={`tab-${key}`}
            aria-selected={activeTab === key}
          >
            <IconFn className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── WORKFLOW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'workflow' && (
        <div className="flex flex-col gap-6">

          {/* Step guide header */}
          <div className="rounded-xl border bg-blue-50/60 p-4 dark:bg-blue-950/20">
            <p className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
              <Lightbulb className="h-4 w-4" /> How it works
            </p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
              Payments are monitored automatically. 3 days before each payment date, a reminder is queued to go out.
              Overdue loans are also tracked daily.
            </p>
          </div>

          {/* Step 1 — Queue */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <StepBadge step={1} active={!step1Done} done={step1Done} />
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">Find clients to notify</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The system will automatically scan all active loans and find clients who are
                  overdue or whose payment is coming up soon. Click the button to prepare the messages.
                </p>
                <div className="mt-4">
                  <button
                    onClick={queueNow}
                    disabled={busy !== null}
                    id="btn-queue-reminders"
                    className="flex items-center gap-2 px-5 py-2.5 text-sm"
                  >
                    {busy === 'queue' 
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing…</> 
                      : <><Search className="h-4 w-4" /> Manual Sync & Queue Updates</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 — Review separator */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <StepBadge step={2} active={step3Active} done={step2Done} />
            <span className={`text-sm font-semibold ${step3Active ? 'text-foreground' : 'text-muted-foreground'}`}>
              Review messages below
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Pending cards */}
          {pending.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    {pending.length} message{pending.length !== 1 ? 's' : ''} awaiting your review
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Read each message below and approve or reject before sending.
                  </p>
                </div>
                <button
                  onClick={approveAll}
                  disabled={busy !== null}
                  id="btn-approve-all"
                  className="flex items-center gap-2 border-emerald-200 bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-700"
                >
                  {busy === 'approveAll' 
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Approving…</> 
                    : <><CheckCircle className="h-4 w-4" /> Approve All {pending.length} Messages</>}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {pending.map(row => (
                  <MessagePreviewCard
                    key={row.id}
                    row={row}
                    onApprove={approveOne}
                    onReject={rejectOne}
                    busy={busy}
                  />
                ))}
              </div>
            </div>
          ) : step1Done ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-muted/40 p-8 text-center">
              <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-foreground">All messages have been reviewed</p>
              <p className="text-sm text-muted-foreground">No messages are waiting for approval.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-muted/40 p-8 text-center">
              <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">No messages prepared yet</p>
              <p className="text-sm text-muted-foreground">Complete Step 1 first to see messages here.</p>
            </div>
          )}

          {/* Step 3 — Send */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <StepBadge step={3} active={step4Active} done={false} />
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">Send approved messages</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once you have reviewed and approved messages above, click here to send them all
                  immediately to your clients via Africa&rsquo;s Talking SMS.
                </p>
                {pending.length > 0 && (
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" /> You still have {pending.length} message(s) awaiting review. Complete Step 2 first.
                  </p>
                )}
                <div className="mt-4">
                  <button
                    onClick={dispatchNow}
                    disabled={busy !== null || pending.length > 0}
                    id="btn-dispatch-sms"
                    className="flex items-center gap-2 px-5 py-2.5 text-sm"
                  >
                    {busy === 'dispatch' 
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> 
                      : <><Send className="h-4 w-4" /> Send All Approved Messages</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-border" />

          {/* Test SMS */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 bg-muted text-muted-foreground">
                <FlaskConical className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">Send a Test SMS</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Not sure if SMS is working? Send a test message to any phone number to confirm your settings are working correctly.
                </p>
                <form onSubmit={sendTestSms} className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Phone e.g. +255712345678"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    required
                    id="test-phone-input"
                    aria-label="Test phone number"
                  />
                  <input
                    className="flex-[2] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Test message text…"
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    required
                    id="test-message-input"
                    aria-label="Test message text"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null}
                    id="btn-send-test-sms"
                    className="flex shrink-0 items-center gap-2 border-slate-200 bg-slate-600 px-4 py-2 text-sm hover:bg-slate-700"
                  >
                    {busy === 'test' 
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> 
                      : <><FlaskConical className="h-4 w-4" /> Send Test</>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPCOMING TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'upcoming' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-blue-50/60 p-4 dark:bg-blue-950/20">
            <p className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
              <Calendar className="h-4 w-4 shrink-0" />
              These are clients with loan payments due in the next 3 days. The SMS status shows whether a reminder message has already been prepared for them.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {['Client Name', 'Phone', 'Loan No.', 'Due Date', 'Days Until', 'Amount Due (TZS)', 'Reminder Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dueSoon.map(row => (
                  <tr key={row.scheduleId} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{row.memberName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.loanNumber}</td>
                    <td className="px-4 py-3 font-medium">{row.expectedDate}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 font-semibold ${row.daysUntil <= 1 ? 'text-red-600' : row.daysUntil <= 2 ? 'text-amber-600' : 'text-foreground'}`}>
                        {row.daysUntil === 0 
                          ? <><AlertCircle className="h-3.5 w-3.5" /> Today!</> 
                          : `${row.daysUntil} day${row.daysUntil !== 1 ? 's' : ''}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {row.amountDue.toLocaleString('en-TZ')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.reminderStatus} />
                    </td>
                  </tr>
                ))}
                {dueSoon.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      <div className="mb-3 flex justify-center">
                        <PartyPopper className="h-10 w-10 text-emerald-500" />
                      </div>
                      <p className="font-medium text-foreground">No payments due in the next 3 days.</p>
                      <p className="mt-1 text-sm">All clear!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-lg border bg-muted p-1">
              {(['all', 'sent', 'pending_approval', 'failed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    logFilter === f
                      ? 'border-border bg-card text-foreground shadow-sm'
                      : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  id={`filter-${f}`}
                >
                  {f === 'all' ? 'All' : f === 'pending_approval' ? 'Awaiting Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-lg border bg-background py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search history…"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                id="history-search"
                aria-label="Search history"
              />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              Showing {filteredLogs.length} of {logs.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[1024px] text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {['Date', 'Phone', 'Type', 'Queue Status', 'Sent At', 'Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.phone}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.reminderKey.startsWith('due_soon') 
                        ? <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Due Soon</span> 
                        : log.reminderKey.startsWith('manual') 
                          ? <span className="flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Manual</span> 
                          : <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Overdue</span>
                      }
                      {log.daysOverdue > 0 && <span className="ml-5 mt-0.5 block text-red-500">({log.daysOverdue}d)</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString('en-GB', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate" title={log.errorMessage ?? ''}>
                      {log.errorMessage ?? '—'}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="mb-3 flex justify-center">
                        <Inbox className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-foreground">No records found</p>
                      <p className="mt-1 text-sm">Try adjusting your filters or search.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
