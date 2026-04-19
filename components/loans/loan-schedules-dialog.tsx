'use client';

import {useState, useEffect, useTransition} from 'react';
import {X, Check, Edit2, RotateCcw, PlusCircle} from 'lucide-react';
import {getLoanSchedulesAction, updateScheduleStatusAction} from '@/lib/actions/loan-schedules';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/lib/navigation';

type Props = {
  loanId: string;
  loanType?: string;
  onClose: () => void;
};

type Schedule = {
  id: string;
  week_number: number;
  expected_date: string;
  expected_amount: number;
  paid_amount: number;
  status: string;
};

export function LoanSchedulesDialog({loanId, loanType, onClose}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const isMonthly = loanType === 'binafsi';
  const periodLabel = isMonthly ? 'Mwezi' : 'Week';
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // State for manual payment entry
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getLoanSchedulesAction(loanId);
      setSchedules(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'Failed to connect to the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSchedules();
  }, [loanId]);

  const handleUpdate = (scheduleId: string, status: string, totalAmount: number) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    let newStatus = 'pending';
    if (totalAmount <= 0) {
      newStatus = 'pending';
    } else if (totalAmount >= schedule.expected_amount) {
      newStatus = 'paid';
    } else {
      newStatus = 'partial';
    }

    // Optimistic update
    setSchedules(prev => prev.map(s => 
      s.id === scheduleId ? {...s, status: newStatus, paid_amount: totalAmount} : s
    ));
    setEditingId(null);
    
    startTransition(async () => {
      const result = await updateScheduleStatusAction(scheduleId, newStatus, totalAmount);
      if (result.error) {
        void fetchSchedules();
      } else {
        router.refresh();
      }
    });
  };

  const startManualPayment = (schedule: Schedule) => {
    setEditingId(schedule.id);
    // Pre-fill with expected amount if zero, otherwise keep current
    setInputAmount(schedule.paid_amount > 0 ? schedule.paid_amount.toString() : schedule.expected_amount.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Marejesho (Repayments Schedule)</h2>
            <p className="text-sm text-muted-foreground">Manage installment tracking and cumulative payments</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">{periodLabel}</th>
                <th className="px-4 py-3 font-semibold">Expected Date</th>
                <th className="px-4 py-3 font-semibold text-right">Expected</th>
                <th className="px-4 py-3 font-semibold text-right">Paid So Far</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading schedules...
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-500 font-medium">
                    ⚠️ {errorMsg}
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No schedule documentation found.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule, index) => {
                  const isPaidFull = schedule.status === 'paid';
                  const isPartial = schedule.status === 'partial';
                  const isEditing = editingId === schedule.id;
                  const hasPreviousUnpaid =
                    index > 0 && (schedules[index - 1]?.status === 'pending' || schedules[index - 1]?.status === 'overdue');
                  
                  return (
                    <tr key={schedule.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{schedule.week_number}</td>
                      <td className="px-4 py-3">{schedule.expected_date}</td>
                      <td className="px-4 py-3 text-right">
                        {new Intl.NumberFormat('en-TZ').format(schedule.expected_amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number"
                              autoFocus
                              className="w-24 rounded border bg-background px-2 py-1 text-right text-xs"
                              value={inputAmount}
                              onChange={(e) => setInputAmount(e.target.value)}
                            />
                            <span className="text-[9px] text-muted-foreground">Enter total paid to date</span>
                          </div>
                        ) : (
                          <span className={schedule.paid_amount > 0 ? "font-bold text-primary" : ""}>
                            {new Intl.NumberFormat('en-TZ').format(schedule.paid_amount)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          schedule.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          schedule.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                          schedule.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {schedule.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleUpdate(schedule.id, 'pending', parseFloat(inputAmount) || 0)}
                              className="rounded bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
                              title="Update Payment Amount"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded bg-slate-200 p-1.5 text-slate-700 hover:bg-slate-300"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Always show "Add/Edit Payment" unless fully paid and we want to lock it (but user wants flexibility) */}
                            {(!isPaidFull || isPartial) && (
                              <>
                                <button
                                  onClick={() => handleUpdate(schedule.id, 'pending', schedule.expected_amount)}
                                  disabled={isPending || hasPreviousUnpaid}
                                  title={hasPreviousUnpaid ? 'Pay previous installment first' : 'Pay Full'}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                                    hasPreviousUnpaid 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                  }`}
                                >
                                  <Check size={12} /> Full
                                </button>
                                <button
                                  onClick={() => startManualPayment(schedule)}
                                  disabled={isPending || hasPreviousUnpaid}
                                  title="Add/Adjust Payment"
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
                                    hasPreviousUnpaid 
                                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
                                  }`}
                                >
                                  {isPartial ? <PlusCircle size={12} /> : <Edit2 size={12} />}
                                  {isPartial ? 'Add' : 'Partial'}
                                </button>
                              </>
                            )}

                            {/* Reversal always available for paid/partial items */}
                            {(isPaidFull || isPartial) && (
                              <button
                                onClick={() => handleUpdate(schedule.id, schedule.status, 0)}
                                disabled={isPending}
                                title="Reset to Pending"
                                className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 p-1 text-rose-700 hover:bg-rose-100 transition-colors"
                              >
                                <RotateCcw size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <p className="p-4 text-[10px] text-muted-foreground bg-muted/20 border-t italic">
            * Note: Entering a new partial amount updates the total paid for that period. The outstanding balance will adjust automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
