'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Download, TrendingUp, CheckCircle2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoanRecord } from '@/types';
import { getLoanSchedulesAction } from '@/lib/actions/loan-schedules';
import { downloadElementAsPdf } from '@/lib/pdf/download-element-as-pdf';

type Props = {
  loan: LoanRecord;
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

export function LoanStatementDialogContent({ loan }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [asOfDate, setAsOfDate] = useState(getTodayIsoLocal());
  const [downloading, setDownloading] = useState(false);
  const statementRef = useRef<HTMLDivElement | null>(null);

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

    // Calculations for "Gains" (Interest)
    const totalPrincipal = Number(loan.disbursementAmount || 0);
    const totalInterest = Number(loan.securityAmount || 0);
    const totalToRepay = totalPrincipal + totalInterest;

    // Pro-rata interest paid
    const interestRatio = totalToRepay > 0 ? totalInterest / totalToRepay : 0;
    const interestPaid = totalPaid * interestRatio;
    const principalPaid = totalPaid - interestPaid;

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
      nextDue,
      totalPrincipal,
      totalInterest,
      interestPaid,
      principalPaid
    };
  }, [asOfDate, schedules, loan.disbursementAmount, loan.securityAmount]);

  const progress = totals.totalExpected
    ? Math.min((totals.totalPaid / totals.totalExpected) * 100, 100)
    : 0;

  const handleDownloadPdf = async () => {
    if (downloading) return;
    const element = statementRef.current;
    if (!element) return;

    try {
      setDownloading(true);
      const safeLoanNo = (loan.loanNumber || 'statement').replace(/[^\w.-]+/g, '-');
      await downloadElementAsPdf(element, { fileName: `loan-statement-${safeLoanNo}.pdf` });
    } finally {
      setDownloading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">Generating Statement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-0">
      {/* Control Bar - Only in Modal View */}
      <div className="flex items-center justify-end no-print bg-muted/10 px-8 py-3 border-b">
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-black text-white shadow-xl transition-all hover:bg-slate-800 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={18} /> {downloading ? 'PREPARING DOCUMENT…' : 'DOWNLOAD OFFICIAL STATEMENT (PDF)'}
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div
        className="flex-1 flex flex-col p-8 md:p-12 print:p-0 print:bg-white"
        ref={statementRef}
      >
        <div id="statement-printable-document" className="print:block">
          {/* Brand & Document Identity */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-[6px] border-slate-900 pb-8 print:border-black">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-xl print:bg-black">V</div>
                <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase print:text-black">VIVA BRIGHTLIFE</h1>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Microfinance Co. Ltd • Financial Excellence</p>
              <div className="mt-6 grid grid-cols-1 gap-1 text-xs font-bold text-slate-600 print:text-slate-700">
                <p>📍 Dodoma, Tanzania</p>
                <p>📞 +255 (0) 700 000 000</p>
                <p>📧 info@vivabrightlife.co.tz</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="rounded-2xl bg-slate-900 px-6 py-2 text-white print:bg-black">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Statement</h2>
              </div>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase text-slate-400">Statement Date</span>
                  <span className="font-black text-slate-900">{getTodayIsoLocal()}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase text-slate-400">Reference Number</span>
                  <span className="font-black text-slate-900">REF-{loan.loanNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account Holder</h3>
              <div className="rounded-3xl border-2 border-slate-100 bg-slate-50/50 p-6 print:bg-white print:border-slate-200">
                <p className="text-2xl font-black text-slate-900 tracking-tight">{loan.memberName}</p>
                <p className="text-sm font-bold text-slate-500 mt-1">{loan.memberPhone || 'Contact details pending'}</p>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase">Member ID</span>
                    <span className="font-black text-slate-900">{loan.memberNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase">Loan Type</span>
                    <span className="font-black text-slate-900">{loan.loanType}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Financial Performance & Calculations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="group relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl transition-all print:bg-black print:shadow-none">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Outstanding Balance</p>
                    <p className="mt-2 text-3xl font-black tracking-tighter">{currency.format(totals.totalRemaining)}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full bg-white transition-all duration-1000 ease-out"
                          style={{ width: `${100 - progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black">{Math.round(100 - progress)}% Left</span>
                    </div>
                  </div>
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                </div>

                <div className="rounded-3xl border-2 border-emerald-100 bg-emerald-50/30 p-6 print:bg-white print:border-emerald-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Company Gains (Interest)</p>
                      <p className="mt-2 text-3xl font-black tracking-tighter text-emerald-700">{currency.format(totals.totalInterest)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-emerald-600/70">Paid Gains</span>
                      <span className="text-emerald-700">{currency.format(totals.interestPaid)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> Repayment Progress
                  </h4>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary uppercase">
                    {progress >= 100 ? 'Fully Paid' : 'In Progress'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Total Principal</p>
                    <p className="text-sm font-black text-slate-900">{currency.format(totals.totalPrincipal)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Total Paid</p>
                    <p className="text-sm font-black text-emerald-600">{currency.format(totals.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Cycle Duration</p>
                    <p className="text-sm font-black text-slate-900">{loan.cycle} {periodLabel}(s)</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Start Date</p>
                    <p className="text-sm font-black text-slate-900">{loan.disbursementDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Transaction Ledger */}
          <div className="mt-12 flex-1 min-h-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Repayment Schedule & History</h3>
              <div className="h-px flex-1 bg-slate-100 mx-6 print:bg-slate-200" />
            </div>

            <div className="overflow-hidden rounded-3xl border-[3px] border-slate-900 print:border-black print:rounded-none">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-white uppercase tracking-wider print:bg-black print:text-white">
                  <tr>
                    <th className="px-6 py-5 font-black border-r border-white/10 text-center">No.</th>
                    <th className="px-6 py-5 font-black border-r border-white/10">Scheduled Date</th>
                    <th className="px-6 py-5 font-black text-right border-r border-white/10">Expected</th>
                    <th className="px-6 py-5 font-black text-right border-r border-white/10">Collected</th>
                    <th className="px-6 py-5 font-black text-right border-r border-white/10">Running Balance</th>
                    <th className="px-6 py-5 font-black text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 bg-white print:divide-slate-300">
                  {(() => {
                    let runningBalance = totals.totalExpected;
                    return schedules.map((schedule, index) => {
                      const status = schedule.status || (Number(schedule.paid_amount) >= Number(schedule.expected_amount) ? 'paid' : 'pending');
                      runningBalance -= Number(schedule.paid_amount || 0);
                      const isPaid = status === 'paid';

                      return (
                        <tr key={schedule.id} className={cn(
                          "transition-colors border-b-2 border-slate-100",
                          isPaid ? "bg-emerald-50/40" : index % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                          "hover:bg-slate-100"
                        )}>
                          <td className="px-6 py-4 font-black text-slate-900 border-r-2 border-slate-100 text-center">{schedule.week_number}</td>
                          <td className="px-6 py-4 font-black text-slate-700 border-r-2 border-slate-100">{schedule.expected_date}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 border-r-2 border-slate-100">{currency.format(schedule.expected_amount)}</td>
                          <td className={cn(
                            "px-6 py-4 text-right font-black border-r-2 border-slate-100",
                            schedule.paid_amount > 0 ? "text-emerald-700" : "text-slate-400"
                          )}>
                            {schedule.paid_amount > 0 ? currency.format(schedule.paid_amount) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-black text-slate-900 border-r-2 border-slate-100">
                            {currency.format(Math.max(0, runningBalance))}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border-2 shadow-sm",
                              status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                status === 'overdue' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                  'bg-slate-100 text-slate-600 border-slate-200'
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

          {/* Professional Footer & Signatures */}
          <div className="mt-16 pt-8 border-t-2 border-dashed border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed max-w-sm">
                  This statement is a computer-generated official record of Viva Brightlife Microfinance.
                  Any discrepancies must be reported to our office within 7 working days.
                </p>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg border-2 border-slate-100 flex items-center justify-center text-slate-200 font-black text-xl italic">STAMP</div>
                  <div className="h-12 w-32 rounded-lg bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Digital Audit OK</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4 text-center">
                  <div className="h-16 w-full border-b-2 border-slate-900 print:border-black"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Member Signature</p>
                </div>
                <div className="space-y-4 text-center">
                  <div className="h-16 w-full border-b-2 border-slate-900 print:border-black"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Officer Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #statement-printable-document, #statement-printable-document * { visibility: visible !important; }
          #statement-printable-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 20mm !important;
          }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}
