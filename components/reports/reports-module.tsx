'use client';

import {useMemo, useState} from 'react';
import {Download, Printer} from 'lucide-react';
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(value);

  const safeText = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const buildExcelHtml = () => {
    const title = `Viva Brightlife Microfinance - ${t(`reports.${reportType}`)}`;
    const rangeText = `${startDate || 'All'} to ${endDate || 'All'}`;
    const headerStyle =
      'background:#1f2937;color:#f9fafb;font-weight:bold;border:1px solid #1f2937;padding:6px;';
    const cellStyle = 'border:1px solid #d1d5db;padding:6px;';
    const headerRow = reportType === 'marejesho_sheet'
      ? [
          'Member',
          'Loan Number',
          'Type',
          'Disbursement Date',
          'Installment',
          'OS Balance',
          ...scheduleDates
        ]
      : ['Member', 'Loan Number', 'Type', 'Amount', 'OS Balance', 'Status'];

    const rowsHtml =
      reportType === 'marejesho_sheet'
        ? filteredMarejesho
            .map((row) => {
              const scheduleMap = new Map(
                row.schedules.map((s) => [s.expectedDate, s])
              );
              const scheduleCells = scheduleDates
                .map((date) => {
                  const sched = scheduleMap.get(date);
                  const value =
                    sched && sched.paidAmount > 0
                      ? sched.paidAmount
                      : sched?.expectedAmount ?? 0;
                  return `<td style="${cellStyle}">${value ? formatCurrency(value) : ''}</td>`;
                })
                .join('');
              return `
                <tr>
                  <td style="${cellStyle}">${safeText(row.memberName)}</td>
                  <td style="${cellStyle}">${safeText(row.loanNumber)}</td>
                  <td style="${cellStyle}">${safeText(row.loanType)}</td>
                  <td style="${cellStyle}">${safeText(row.disbursementDate)}</td>
                  <td style="${cellStyle}">${formatCurrency(row.installmentAmount)}</td>
                  <td style="${cellStyle}">${formatCurrency(row.outstandingBalance)}</td>
                  ${scheduleCells}
                </tr>
              `;
            })
            .join('')
        : rows
            .map((row) => {
              return `
                <tr>
                  <td style="${cellStyle}">${safeText(row.memberName)}</td>
                  <td style="${cellStyle}">${safeText(row.loanNumber)}</td>
                  <td style="${cellStyle}">${safeText(row.loanType)}</td>
                  <td style="${cellStyle}">${formatCurrency(row.disbursementAmount)}</td>
                  <td style="${cellStyle}">${formatCurrency(row.outstandingBalance)}</td>
                  <td style="${cellStyle}">${safeText(row.status)}</td>
                </tr>
              `;
            })
            .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px;width:100%;">
            <tr>
              <td colspan="${headerRow.length}" style="font-size:16px;font-weight:bold;padding:8px 6px;">
                ${safeText(title)}
              </td>
            </tr>
            <tr>
              <td colspan="${headerRow.length}" style="color:#6b7280;padding:0 6px 12px 6px;">
                ${safeText(rangeText)}
              </td>
            </tr>
            <tr>
              ${headerRow.map((label) => `<th style="${headerStyle}">${safeText(label)}</th>`).join('')}
            </tr>
            ${rowsHtml}
          </table>
        </body>
      </html>
    `;
  };

  const downloadExcel = () => {
    const html = buildExcelHtml();
    const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = `${startDate || 'all'}_${endDate || 'all'}`;
    link.href = url;
    link.download = `${reportType}-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('reports.title')}</h1>
        <div className="no-print flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            onClick={downloadExcel}
          >
            <Download size={16} /> {t('buttons.export')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            onClick={() => window.print()}
          >
            <Printer size={16} /> {t('buttons.print')}
          </button>
        </div>
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
