'use client';

import {useMemo, useState} from 'react';
import {Printer} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {LoanRecord} from '@/types';
import type {MarejeshoRow} from '@/lib/data';

const reportTypes = [
  'monthly_collection',
  'disbursement',
  'overdue',
  'member_statement',
  'group_performance',
  'marejesho_sheet'
] as const;

type Props = {
  initialRows: LoanRecord[];
  marejeshoRows: MarejeshoRow[];
};

export function ReportsModule({initialRows, marejeshoRows}: Props) {
  const t = useTranslations();
  const [loanType, setLoanType] = useState('all');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<(typeof reportTypes)[number]>('monthly_collection');

  const rows = useMemo(
    () =>
      initialRows.filter((loan) => {
        const typeOk = loanType === 'all' || loan.loanType === loanType;
        const statusOk = status === 'all' || loan.status === status;
        const dateOk =
          (!startDate || loan.disbursementDate >= startDate) &&
          (!endDate || loan.disbursementDate <= endDate);
        return typeOk && statusOk && dateOk;
      }),
    [endDate, initialRows, loanType, startDate, status]
  );

  const filteredMarejesho = useMemo(
    () =>
      marejeshoRows.filter((loan) => {
        const typeOk = loanType === 'all' || loan.loanType === loanType;
        const statusOk = status === 'all' || loan.status === status;
        const dateOk =
          (!startDate || loan.disbursementDate >= startDate) &&
          (!endDate || loan.disbursementDate <= endDate);
        return typeOk && statusOk && dateOk;
      }),
    [endDate, loanType, marejeshoRows, startDate, status]
  );

  const scheduleDates = useMemo(() => {
    const dates = new Set<string>();
    filteredMarejesho.forEach((loan) => {
      loan.schedules.forEach((schedule) => {
        if (startDate && schedule.expectedDate < startDate) return;
        if (endDate && schedule.expectedDate > endDate) return;
        dates.add(schedule.expectedDate);
      });
    });
    return Array.from(dates).sort();
  }, [filteredMarejesho, startDate, endDate]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('reports.title')}</h1>
        <button
          className="no-print inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          onClick={() => window.print()}
        >
          <Printer size={16} /> {t('buttons.print')}
        </button>
      </div>

      <div className="no-print grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5">
        <input
          type="date"
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={loanType}
          onChange={(e) => setLoanType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="binafsi">binafsi</option>
          <option value="biashara">biashara</option>
          <option value="watumishi">watumishi</option>
          <option value="electronics">electronics</option>
          <option value="kilimo">kilimo</option>
          <option value="bima">bima</option>
          <option value="vikundi_wakinamama">vikundi_wakinamama</option>
          <option value="vyombo_moto">vyombo_moto</option>
        </select>
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="defaulted">Defaulted</option>
          <option value="pending">Pending</option>
        </select>
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={reportType}
          onChange={(e) =>
            setReportType(e.target.value as (typeof reportTypes)[number])
          }
        >
          {reportTypes.map((type) => (
            <option key={type} value={type}>
              {t(`reports.${type}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-card p-4 print-area">
        <div className="mb-4 border-b pb-3">
          <h2 className="text-lg font-semibold">Viva Brightlife Microfinance</h2>
          <p className="text-sm text-muted-foreground">{t(`reports.${reportType}`)}</p>
          <p className="text-xs text-muted-foreground">
            {startDate || 'All'} to {endDate || 'All'}
          </p>
        </div>
        {reportType === 'marejesho_sheet' ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/70 text-left">
                <tr>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Loan Number</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Disbursement Date</th>
                  <th className="px-3 py-2">Installment</th>
                  <th className="px-3 py-2">OS Balance</th>
                  {scheduleDates.map((date) => (
                    <th key={date} className="px-3 py-2 whitespace-nowrap">
                      {date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMarejesho.map((row) => {
                  const scheduleMap = new Map(
                    row.schedules.map((s) => [s.expectedDate, s])
                  );
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">{row.memberName}</td>
                      <td className="px-3 py-2">{row.loanNumber}</td>
                      <td className="px-3 py-2">{row.loanType}</td>
                      <td className="px-3 py-2">{row.disbursementDate}</td>
                      <td className="px-3 py-2">{row.installmentAmount.toLocaleString()}</td>
                      <td className="px-3 py-2">{row.outstandingBalance.toLocaleString()}</td>
                      {scheduleDates.map((date) => {
                        const sched = scheduleMap.get(date);
                        const value =
                          sched && sched.paidAmount > 0
                            ? sched.paidAmount
                            : sched?.expectedAmount ?? null;
                        return (
                          <td key={date} className="px-3 py-2">
                            {value ? value.toLocaleString() : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Loan Number</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">OS Balance</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.memberName}</td>
                  <td className="px-3 py-2">{row.loanNumber}</td>
                  <td className="px-3 py-2">{row.loanType}</td>
                  <td className="px-3 py-2">{row.disbursementAmount.toLocaleString()}</td>
                  <td className="px-3 py-2">{row.outstandingBalance.toLocaleString()}</td>
                  <td className="px-3 py-2 capitalize">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
