'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Printer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoanRecord } from '@/types';
import { getLoanSchedulesAction } from '@/lib/actions/loan-schedules';

type Props = {
  loan: LoanRecord;
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

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0
});

const getTodayIsoLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function LoanStatementDialog({ loan, onClose }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [asOfDate, setAsOfDate] = useState(getTodayIsoLocal());

  const periodLabel = loan.loanType === 'binafsi'
    ? (loan.repaymentFrequency === 'monthly' ? 'Month' : loan.repaymentFrequency === 'weekly' ? 'Week' : 'Day')
    : 'Week';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getLoanSchedulesAction(loan.id);
        setSchedules(data as Schedule[]);
      } catch (error: any) {
        setErrorMsg(error?.message || 'Failed to load loan schedules.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loan.id]);

  const totals = useMemo(() => {
    const totalExpected = schedules.reduce(
      (sum, row) => sum + Number(row.expected_amount ?? 0),
      0
    );
    const totalPaid = schedules.reduce(
      (sum, row) => sum + Number(row.paid_amount ?? 0),
      0
    );
    const totalRemaining = Math.max(totalExpected - totalPaid, 0);

    const datedSchedules = asOfDate
      ? schedules.filter((row) => row.expected_date <= asOfDate)
      : schedules;
    const expectedToDate = datedSchedules.reduce(
      (sum, row) => sum + Number(row.expected_amount ?? 0),
      0
    );
    const paidToDate = datedSchedules.reduce(
      (sum, row) => sum + Number(row.paid_amount ?? 0),
      0
    );
    const remainingToDate = Math.max(expectedToDate - paidToDate, 0);

    const nextDue = schedules.find(
      (row) =>
        (!asOfDate || row.expected_date >= asOfDate) &&
        Number(row.paid_amount ?? 0) < Number(row.expected_amount ?? 0)
    );

    return {
      totalExpected,
      totalPaid,
      totalRemaining,
      expectedToDate,
      paidToDate,
      remainingToDate,
      nextDue
    };
  }, [asOfDate, schedules]);

  const progress = totals.totalExpected
    ? Math.min((totals.totalPaid / totals.totalExpected) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:bg-transparent print:p-0" id="statement-modal-overlay">
      <div 
        className="flex max-h-[95vh] w-full max-w-5xl flex-col rounded-2xl bg-background border p-8 shadow-2xl overflow-hidden print-area print:max-h-none print:w-auto print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
        id="statement-printable-document"
      >
        
        {/* Header - Buttons (Hidden on Print) */}
        <div className="mb-6 flex items-center justify-between no-print border-b pb-4">
          <div>
            <h2 className="text-2xl font-black text-foreground">Loan Statement Preview</h2>
            <p className="text-sm font-bold text-muted-foreground">Review member financial history</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-black text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Printer size={18} /> PRINT
            </button>
            <button 
              onClick={onClose} 
              className="rounded-full bg-muted p-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Printable Area Start */}
        <div className="flex-1 flex min-h-0 flex-col overflow-auto print:overflow-visible print:p-8">
          
          {/* Professional Document Header */}
          <div className="flex flex-col md:flex-row justify-between gap-6 border-b-4 border-foreground pb-6 print:border-black">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase print:text-black">VIVA BRIGHTLIFE</h1>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground print:text-slate-500">Microfinance Co. Ltd</p>
              <div className="mt-4 space-y-0.5 text-sm font-bold text-foreground/80 print:text-slate-700">
                <p>Dar es Salaam, Tanzania</p>
                <p>Email: info@vivabrightlife.co.tz</p>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-4xl font-black text-foreground uppercase print:text-black">Statement</h2>
              <div className="mt-4 space-y-1 text-sm font-black text-foreground print:text-black">
                <p>Date: {getTodayIsoLocal()}</p>
                <p className="text-muted-foreground font-bold uppercase text-[10px] print:text-slate-500">Ref: {loan.loanNumber}</p>
              </div>
            </div>
          </div>

          {/* Member & Loan Summary Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground print:text-slate-400">Account Holder</h3>
              <div className="rounded-2xl border bg-muted/30 p-5 print:bg-slate-50 print:border-slate-100">
                <p className="text-2xl font-black text-foreground print:text-black">{loan.memberName}</p>
                <p className="text-sm font-bold text-muted-foreground mt-1">{loan.memberPhone || 'No contact'}</p>
                <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs font-black uppercase print:border-slate-200">
                  <span className="text-muted-foreground print:text-slate-400">Loan Type:</span>
                  <span className="text-foreground print:text-black">{loan.loanType} ({loan.repaymentFrequency || 'Monthly'})</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground print:text-slate-400">Financial Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-foreground p-4 text-background print:bg-black print:text-white">
                  <p className="text-[10px] font-black uppercase opacity-70">Balance Due</p>
                  <p className="mt-1 text-xl font-black">{currency.format(totals.totalRemaining)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 print:bg-emerald-50 print:border-emerald-200">
                  <p className="text-[10px] font-black uppercase text-emerald-600">Total Paid</p>
                  <p className="mt-1 text-xl font-black text-emerald-600 print:text-emerald-800">{currency.format(totals.totalPaid)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Financial Breakdown */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border p-4 print:bg-white print:border-slate-100">
              <p className="text-[10px] font-black uppercase text-muted-foreground print:text-slate-400">Principal</p>
              <p className="text-lg font-black text-foreground print:text-black">{currency.format(loan.disbursementAmount)}</p>
            </div>
            <div className="rounded-xl border p-4 print:bg-white print:border-slate-100">
              <p className="text-[10px] font-black uppercase text-muted-foreground print:text-slate-400">Interest</p>
              <p className="text-lg font-black text-foreground print:text-black">{currency.format(loan.securityAmount)}</p>
            </div>
            <div className="rounded-xl border p-4 print:bg-white print:border-slate-100">
              <p className="text-[10px] font-black uppercase text-muted-foreground print:text-slate-400">Duration</p>
              <p className="text-lg font-black text-foreground print:text-black">{loan.cycle} {periodLabel}(s)</p>
            </div>
            <div className="rounded-xl border p-4 print:bg-white print:border-slate-100">
              <p className="text-[10px] font-black uppercase text-muted-foreground print:text-slate-400">Disbursed</p>
              <p className="text-lg font-black text-foreground print:text-black">{loan.disbursementDate}</p>
            </div>
          </div>

          {/* Repayment Schedule Table */}
          <div className="mt-10 flex-1 min-h-0">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 print:text-slate-400">Repayment History</h3>
            <div className="rounded-2xl border-4 border-foreground overflow-hidden print:border-black">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-foreground text-background uppercase tracking-tighter print:bg-black print:text-white">
                  <tr>
                    <th className="px-4 py-4 font-black">{periodLabel}</th>
                    <th className="px-4 py-4 font-black">Due Date</th>
                    <th className="px-4 py-4 font-black text-right">Expected</th>
                    <th className="px-4 py-4 font-black text-right">Collected</th>
                    <th className="px-4 py-4 font-black text-right">Balance</th>
                    <th className="px-4 py-4 font-black text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-slate-100">
                  {(() => {
                    let runningBalance = totals.totalExpected;
                    return schedules.map((schedule) => {
                      const status = schedule.status || (Number(schedule.paid_amount) >= Number(schedule.expected_amount) ? 'paid' : 'pending');
                      runningBalance -= Number(schedule.paid_amount || 0);
                      const isPaid = status === 'paid';
                      
                      return (
                        <tr key={schedule.id} className={cn("hover:bg-muted/50 transition-colors print:hover:bg-transparent", isPaid ? "bg-muted/20 print:bg-slate-50/50" : "")}>
                          <td className="px-4 py-2.5 font-black text-foreground print:text-black">{schedule.week_number}</td>
                          <td className="px-4 py-2.5 font-bold text-foreground/80 print:text-slate-700">{schedule.expected_date}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-foreground print:text-black">{currency.format(schedule.expected_amount)}</td>
                          <td className={cn(
                            "px-4 py-2.5 text-right font-black",
                            schedule.paid_amount > 0 ? "text-emerald-500 print:text-emerald-700" : "text-muted-foreground print:text-slate-300"
                          )}>
                            {schedule.paid_amount > 0 ? currency.format(schedule.paid_amount) : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-black text-foreground print:text-black">
                            {currency.format(Math.max(0, runningBalance))}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-1 rounded-full border",
                              status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 print:bg-emerald-50 print:text-emerald-700' : 
                              status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 print:bg-rose-50 print:text-rose-700' : 
                              'bg-muted text-muted-foreground border-border print:bg-slate-50 print:text-slate-500'
                            )}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer (Always bottom on print) */}
        <div className="statement-footer grid grid-cols-2 gap-12 border-t border-border px-0 pb-0 pt-8 print:mt-auto print:border-slate-200 print:px-8 print:pb-6 print:pt-6">
          <div className="flex items-end">
            <p className="text-[10px] font-bold text-muted-foreground italic leading-relaxed print:text-slate-500">
              Computer-generated official statement from Viva Brightlife. Report errors within 7 days.
            </p>
          </div>
          <div className="text-right space-y-6">
            <div className="inline-block h-10 w-56 border-b-2 border-foreground print:border-black"></div>
            <p className="text-xs font-black uppercase text-foreground print:text-black">Authorized Signature</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          /* Remove everything from layout, then print only the statement overlay */
          body * {
            display: none !important;
          }

          #statement-modal-overlay,
          #statement-modal-overlay * {
            display: revert !important;
          }

          html, body {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          #statement-modal-overlay {
            position: static !important;
            inset: auto !important;
            background: none !important;
            padding: 0 !important;
            backdrop-filter: none !important;
            transform: none !important;
          }

          #statement-printable-document {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            background: white !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .statement-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .no-print { display: none !important; }

          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
