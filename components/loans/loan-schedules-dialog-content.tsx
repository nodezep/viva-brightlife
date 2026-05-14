'use client';

import {useState, useEffect, useTransition} from 'react';
import {X, Check, Edit2, RotateCcw, PlusCircle, Loader2} from 'lucide-react';
import {getLoanSchedulesAction, updateScheduleStatusAction, regenerateLoanSchedulesAction} from '@/lib/actions/loan-schedules';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/lib/navigation';

type Props = {
  loanId: string;
  loanType?: string;
  repaymentFrequency?: 'weekly' | 'daily' | 'monthly';
};

type Schedule = {
  id: string;
  week_number: number;
  expected_date: string;
  expected_amount: number;
  paid_amount: number;
  status: string;
};

export function LoanSchedulesDialogContent({loanId, loanType, repaymentFrequency}: Props) {
  const t = useTranslations();
  const router = useRouter();
  
  const periodLabel = loanType === 'binafsi' 
    ? (repaymentFrequency === 'monthly' ? 'Mwezi' : repaymentFrequency === 'weekly' ? 'Wiki' : 'Siku')
    : 'Week';
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    setInputAmount(schedule.paid_amount > 0 ? schedule.paid_amount.toString() : schedule.expected_amount.toString());
  };

  const handleRegenerate = () => {
    if (!window.confirm('Are you sure you want to fix this schedule? This will reset all pending installments to their calculated monthly values.')) return;
    
    startTransition(async () => {
      const result = await regenerateLoanSchedulesAction(loanId);
      if (result.error) {
        alert(result.error);
      } else {
        void fetchSchedules();
        router.refresh();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest">Loading Repayments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Marejesho (Repayments Schedule)</h3>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tracking & Cumulative Payments</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isPending || loading}
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition-all disabled:opacity-50"
        >
          <RotateCcw size={16} className={isPending ? 'animate-spin' : ''} /> 
          FIX SCHEDULE
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-slate-900 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-white uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-black">{periodLabel}</th>
              <th className="px-6 py-4 font-black">Expected Date</th>
              <th className="px-6 py-4 font-black text-right">Expected</th>
              <th className="px-6 py-4 font-black text-right">Paid So Far</th>
              <th className="px-6 py-4 font-black text-center">Status</th>
              <th className="px-6 py-4 font-black text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {errorMsg ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-red-500 font-black uppercase text-xs">
                  ⚠️ {errorMsg}
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-black uppercase text-xs">
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
                  <tr key={schedule.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-black text-slate-900">{schedule.week_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-600">{schedule.expected_date}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {new Intl.NumberFormat('en-TZ').format(schedule.expected_amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            autoFocus
                            className="w-28 rounded-lg border-2 border-primary bg-background px-3 py-1.5 text-right text-xs font-black"
                            value={inputAmount}
                            onChange={(e) => setInputAmount(e.target.value)}
                          />
                        </div>
                      ) : (
                        <span className={schedule.paid_amount > 0 ? "font-black text-slate-900" : "font-black text-slate-400"}>
                          {schedule.paid_amount > 0 ? new Intl.NumberFormat('en-TZ').format(schedule.paid_amount) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border-2 ${
                        schedule.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        schedule.status === 'overdue' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        schedule.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdate(schedule.id, 'pending', parseFloat(inputAmount) || 0)}
                            className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 transition-all shadow-md"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg bg-slate-200 p-2 text-slate-700 hover:bg-slate-300 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center gap-2">
                          {(!isPaidFull || isPartial) && (
                            <>
                              <button
                                onClick={() => handleUpdate(schedule.id, 'pending', schedule.expected_amount)}
                                disabled={isPending || hasPreviousUnpaid}
                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-black transition-all shadow-md ${
                                  hasPreviousUnpaid 
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95'
                                }`}
                              >
                                <Check size={14} /> FULL PAYMENT
                              </button>
                              <button
                                onClick={() => startManualPayment(schedule)}
                                disabled={isPending || hasPreviousUnpaid}
                                className={`inline-flex items-center gap-2 rounded-xl border-2 px-5 py-2.5 text-[11px] font-black transition-all shadow-sm ${
                                  hasPreviousUnpaid 
                                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                  : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-900 hover:text-white hover:scale-105 active:scale-95'
                                }`}
                              >
                                {isPartial ? <PlusCircle size={14} /> : <Edit2 size={14} />}
                                {isPartial ? 'ADD AMOUNT' : 'PARTIAL'}
                              </button>
                            </>
                          )}
                          {(isPaidFull || isPartial) && (
                            <button
                              onClick={() => handleUpdate(schedule.id, schedule.status, 0)}
                              disabled={isPending}
                              className="inline-flex items-center justify-center rounded-xl border-2 border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 transition-all hover:scale-105"
                            >
                              <RotateCcw size={16} />
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
      </div>
      <p className="mt-6 text-[10px] text-muted-foreground italic font-bold uppercase tracking-widest text-center">
        * System provides real-time audit of all repayment activities *
      </p>
    </div>
  );
}
