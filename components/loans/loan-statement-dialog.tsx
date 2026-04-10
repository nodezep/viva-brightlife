'use client';

import {useEffect, useMemo, useState} from 'react';
import {CalendarDays, Printer, X} from 'lucide-react';
import type {LoanRecord} from '@/types';
import {getLoanSchedulesAction} from '@/lib/actions/loan-schedules';

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

export function LoanStatementDialog({loan, onClose}: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [asOfDate, setAsOfDate] = useState(getTodayIsoLocal());

  const isMonthly = loan.loanType === 'binafsi';
  const periodLabel = isMonthly ? 'Month' : 'Week';

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
  const progressToDate = totals.expectedToDate
    ? Math.min((totals.paidToDate / totals.expectedToDate) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-background p-6 shadow-xl print-area">
        <div className="mb-4 flex items-center justify-between no-print">
          <div>
            <h2 className="text-xl font-bold">Loan Statement</h2>
            <p className="text-sm text-muted-foreground">
              {loan.memberName} · Loan {loan.loanNumber}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Viva Brightlife Microfinance</h3>
              <p className="text-sm text-muted-foreground">
                Statement for {loan.memberName}
              </p>
            </div>
            <div className="flex items-center gap-3 no-print">
              <CalendarDays size={16} className="text-muted-foreground" />
              <input
                type="date"
                className="rounded-lg border bg-background px-3 py-2 text-sm"
                value={asOfDate}
                onChange={(event) => setAsOfDate(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total Expected
              </p>
              <p className="mt-2 text-lg font-semibold">
                {currency.format(totals.totalExpected)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total paid {currency.format(totals.totalPaid)}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Remaining Balance
              </p>
              <p className="mt-2 text-lg font-semibold">
                {currency.format(totals.totalRemaining)}
              </p>
              <p className="text-xs text-muted-foreground">
                Progress {progress.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                As of {asOfDate || 'All dates'}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {currency.format(totals.paidToDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                Remaining {currency.format(totals.remainingToDate)} ·{' '}
                {progressToDate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-background p-3 text-sm">
              <p className="text-xs text-muted-foreground">Loan Type</p>
              <p className="font-semibold capitalize">{loan.loanType}</p>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm">
              <p className="text-xs text-muted-foreground">Disbursement Date</p>
              <p className="font-semibold">{loan.disbursementDate}</p>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm">
              <p className="text-xs text-muted-foreground">Next Due</p>
              <p className="font-semibold">
                {totals.nextDue?.expected_date ?? 'Completed'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">{periodLabel}</th>
                <th className="px-4 py-3 font-semibold">Expected Date</th>
                <th className="px-4 py-3 font-semibold">Expected Amount</th>
                <th className="px-4 py-3 font-semibold">Paid Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading schedules...
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                    {errorMsg}
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No schedule data available.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => {
                  const status =
                    schedule.status ||
                    (Number(schedule.paid_amount ?? 0) >=
                    Number(schedule.expected_amount ?? 0)
                      ? 'paid'
                      : 'pending');
                  return (
                    <tr key={schedule.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{schedule.week_number}</td>
                      <td className="px-4 py-3">{schedule.expected_date}</td>
                      <td className="px-4 py-3">
                        {currency.format(schedule.expected_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {currency.format(schedule.paid_amount)}
                      </td>
                      <td className="px-4 py-3 capitalize">{status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
