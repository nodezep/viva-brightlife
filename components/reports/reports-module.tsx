'use client';

import {useMemo, useState} from 'react';
import {
  BarChart3,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  PieChart
} from 'lucide-react';
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

type BreakdownItem = {
  label: string;
  value: number;
  swatch: string;
  textColor: string;
};

const statusPalette: Record<string, BreakdownItem> = {
  active: {label: 'Active', value: 0, swatch: '#10b981', textColor: 'text-emerald-700'},
  closed: {label: 'Closed', value: 0, swatch: '#94a3b8', textColor: 'text-slate-700'},
  defaulted: {label: 'Defaulted', value: 0, swatch: '#f43f5e', textColor: 'text-rose-700'},
  pending: {label: 'Pending', value: 0, swatch: '#f59e0b', textColor: 'text-amber-700'}
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(value);

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'short',
    year: '2-digit'
  });
};

const getTodayIsoLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ReportsModule({initialRows, marejeshoRows}: Props) {
  const t = useTranslations();
  const [loanType, setLoanType] = useState('all');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<(typeof reportTypes)[number]>(
    'monthly_collection'
  );

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

  const summary = useMemo(() => {
    const totalDisbursed = rows.reduce(
      (sum, row) => sum + Number(row.disbursementAmount ?? 0),
      0
    );
    const totalOutstanding = rows.reduce(
      (sum, row) => sum + Number(row.outstandingBalance ?? 0),
      0
    );
    const activeLoans = rows.filter((row) => row.status === 'active').length;
    const defaultedLoans = rows.filter((row) => row.status === 'defaulted').length;
    const overdueLoans = rows.filter((row) => (row.daysOverdue ?? 0) > 0).length;
    const avgTicket = rows.length > 0 ? totalDisbursed / rows.length : 0;

    return {
      totalDisbursed,
      totalOutstanding,
      activeLoans,
      defaultedLoans,
      overdueLoans,
      avgTicket
    };
  }, [rows]);

  const scheduleSummary = useMemo(() => {
    let expected = 0;
    let paid = 0;
    filteredMarejesho.forEach((loan) => {
      loan.schedules.forEach((schedule) => {
        if (startDate && schedule.expectedDate < startDate) return;
        if (endDate && schedule.expectedDate > endDate) return;
        expected += Number(schedule.expectedAmount ?? 0);
        paid += Number(schedule.paidAmount ?? 0);
      });
    });
    return {
      expected,
      paid,
      gap: Math.max(expected - paid, 0)
    };
  }, [filteredMarejesho, startDate, endDate]);

  const monthlySchedule = useMemo(() => {
    const buckets = new Map<
      string,
      {
        expected: number;
        paid: number;
        overdueAmount: number;
        dueCount: number;
        paidCount: number;
      }
    >();
    const todayStr = getTodayIsoLocal();

    filteredMarejesho.forEach((loan) => {
      loan.schedules.forEach((schedule) => {
        if (startDate && schedule.expectedDate < startDate) return;
        if (endDate && schedule.expectedDate > endDate) return;
        const monthKey = schedule.expectedDate.slice(0, 7);
        const bucket =
          buckets.get(monthKey) ?? {
            expected: 0,
            paid: 0,
            overdueAmount: 0,
            dueCount: 0,
            paidCount: 0
          };
        const expected = Number(schedule.expectedAmount ?? 0);
        const paid = Number(schedule.paidAmount ?? 0);
        bucket.expected += expected;
        bucket.paid += paid;
        bucket.dueCount += 1;
        if (paid >= expected && expected > 0) {
          bucket.paidCount += 1;
        }
        if (schedule.expectedDate < todayStr && paid < expected) {
          bucket.overdueAmount += Math.max(expected - paid, 0);
        }
        buckets.set(monthKey, bucket);
      });
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, bucket]) => ({
        month,
        label: formatMonthLabel(month),
        expected: bucket.expected,
        paid: bucket.paid,
        gap: Math.max(bucket.expected - bucket.paid, 0),
        overdueAmount: bucket.overdueAmount,
        dueCount: bucket.dueCount,
        paidCount: bucket.paidCount,
        collectionRate:
          bucket.expected > 0 ? (bucket.paid / bucket.expected) * 100 : 0
      }));
  }, [filteredMarejesho, startDate, endDate]);

  const monthlyTotals = useMemo(() => {
    return monthlySchedule.reduce(
      (acc, row) => {
        acc.expected += row.expected;
        acc.paid += row.paid;
        acc.gap += row.gap;
        acc.overdueAmount += row.overdueAmount;
        acc.dueCount += row.dueCount;
        acc.paidCount += row.paidCount;
        return acc;
      },
      {
        expected: 0,
        paid: 0,
        gap: 0,
        overdueAmount: 0,
        dueCount: 0,
        paidCount: 0
      }
    );
  }, [monthlySchedule]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, BreakdownItem> = {
      active: {...statusPalette.active},
      closed: {...statusPalette.closed},
      defaulted: {...statusPalette.defaulted},
      pending: {...statusPalette.pending}
    };
    rows.forEach((row) => {
      const key = row.status;
      if (!counts[key]) return;
      counts[key].value += 1;
    });
    return Object.values(counts);
  }, [rows]);

  const statusSegments = useMemo(() => {
    const total = statusBreakdown.reduce((sum, item) => sum + item.value, 0);
    let cumulative = 0;
    return statusBreakdown.map((item) => {
      const percent = total === 0 ? 0 : item.value / total;
      const dash = `${(percent * 100).toFixed(3)} ${(100 - percent * 100).toFixed(3)}`;
      const offset = 25 - cumulative * 100;
      cumulative += percent;
      return {item, dash, offset};
    });
  }, [statusBreakdown]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      map.set(row.loanType, (map.get(row.loanType) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({label, value}))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const disbursementSeries = useMemo(() => {
    const buckets = new Map<string, number>();
    rows.forEach((row) => {
      const monthKey = row.disbursementDate.slice(0, 7);
      buckets.set(monthKey, (buckets.get(monthKey) ?? 0) + row.disbursementAmount);
    });
    const allMonths = Array.from(buckets.keys()).sort();
    const recent = allMonths.slice(-6);
    return recent.map((month) => ({
      month,
      label: formatMonthLabel(month),
      value: buckets.get(month) ?? 0
    }));
  }, [rows]);

  const maxDisbursement = Math.max(
    ...disbursementSeries.map((entry) => entry.value),
    1
  );

  const downloadXlsx = async () => {
    const excelJSImport = await import('exceljs');
    const ExcelJS = excelJSImport.default ?? excelJSImport;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Viva Brightlife Microfinance';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      {header: 'Metric', key: 'metric', width: 30},
      {header: 'Value', key: 'value', width: 25}
    ];
    summarySheet.addRow({
      metric: 'Report',
      value: t(`reports.${reportType}`)
    });
    summarySheet.addRow({
      metric: 'Date Range',
      value: `${startDate || 'All'} to ${endDate || 'All'}`
    });
    summarySheet.addRow({metric: 'Total Disbursed', value: summary.totalDisbursed});
    summarySheet.addRow({metric: 'Outstanding Balance', value: summary.totalOutstanding});
    summarySheet.addRow({metric: 'Overdue Loans', value: summary.overdueLoans});
    summarySheet.addRow({metric: 'Active Loans', value: summary.activeLoans});
    summarySheet.addRow({metric: 'Defaulted Loans', value: summary.defaultedLoans});
    summarySheet.addRow({metric: 'Schedule Expected', value: scheduleSummary.expected});
    summarySheet.addRow({metric: 'Schedule Paid', value: scheduleSummary.paid});
    summarySheet.addRow({metric: 'Schedule Gap', value: scheduleSummary.gap});
    summarySheet.addRow({metric: 'Monthly Expected', value: monthlyTotals.expected});
    summarySheet.addRow({metric: 'Monthly Paid', value: monthlyTotals.paid});
    summarySheet.addRow({metric: 'Monthly Gap', value: monthlyTotals.gap});
    summarySheet.addRow({metric: 'Monthly Overdue', value: monthlyTotals.overdueAmount});

    summarySheet.getRow(1).font = {bold: true};
    summarySheet.getColumn('value').numFmt = '#,##0';

    const loansSheet = workbook.addWorksheet('Loans');
    loansSheet.columns = [
      {header: 'Member', key: 'member', width: 28},
      {header: 'Loan Number', key: 'loanNumber', width: 16},
      {header: 'Type', key: 'type', width: 14},
      {header: 'Disbursement Date', key: 'disbursementDate', width: 16},
      {header: 'Amount', key: 'amount', width: 16},
      {header: 'OS Balance', key: 'osBalance', width: 16},
      {header: 'Status', key: 'status', width: 12}
    ];

    rows.forEach((row) => {
      loansSheet.addRow({
        member: row.memberName,
        loanNumber: row.loanNumber,
        type: row.loanType,
        disbursementDate: row.disbursementDate,
        amount: row.disbursementAmount,
        osBalance: row.outstandingBalance,
        status: row.status
      });
    });

    loansSheet.getRow(1).font = {bold: true};
    loansSheet.getColumn('amount').numFmt = '#,##0';
    loansSheet.getColumn('osBalance').numFmt = '#,##0';

    const marejeshoSheet = workbook.addWorksheet('Marejesho');
    const marejeshoHeaders = [
      'Member',
      'Loan Number',
      'Type',
      'Disbursement Date',
      'Installment',
      'OS Balance',
      ...scheduleDates
    ];

    marejeshoSheet.addRow(marejeshoHeaders);

    filteredMarejesho.forEach((row) => {
      const scheduleMap = new Map(row.schedules.map((s) => [s.expectedDate, s]));
      const scheduleCells = scheduleDates.map((date) => {
        const sched = scheduleMap.get(date);
        const value =
          sched && sched.paidAmount > 0
            ? sched.paidAmount
            : sched?.expectedAmount ?? '';
        return value;
      });
      marejeshoSheet.addRow([
        row.memberName,
        row.loanNumber,
        row.loanType,
        row.disbursementDate,
        row.installmentAmount,
        row.outstandingBalance,
        ...scheduleCells
      ]);
    });

    marejeshoSheet.getRow(1).font = {bold: true};
    marejeshoSheet.columns?.forEach((col, index) => {
      if (index >= 4) {
        col.numFmt = '#,##0';
      }
      if (!col.width) {
        col.width = 16;
      }
    });

    const monthlySheet = workbook.addWorksheet('Monthly Collections');
    monthlySheet.columns = [
      {header: 'Month', key: 'month', width: 14},
      {header: 'Expected', key: 'expected', width: 16},
      {header: 'Paid', key: 'paid', width: 16},
      {header: 'Gap', key: 'gap', width: 16},
      {header: 'Overdue Amount', key: 'overdue', width: 18},
      {header: 'Due Count', key: 'dueCount', width: 12},
      {header: 'Paid Count', key: 'paidCount', width: 12},
      {header: 'Collection %', key: 'rate', width: 14}
    ];

    monthlySchedule.forEach((row) => {
      monthlySheet.addRow({
        month: row.label,
        expected: row.expected,
        paid: row.paid,
        gap: row.gap,
        overdue: row.overdueAmount,
        dueCount: row.dueCount,
        paidCount: row.paidCount,
        rate: row.collectionRate / 100
      });
    });
    monthlySheet.getRow(1).font = {bold: true};
    monthlySheet.getColumn('expected').numFmt = '#,##0';
    monthlySheet.getColumn('paid').numFmt = '#,##0';
    monthlySheet.getColumn('gap').numFmt = '#,##0';
    monthlySheet.getColumn('overdue').numFmt = '#,##0';
    monthlySheet.getColumn('rate').numFmt = '0.00%';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = `${startDate || 'all'}_${endDate || 'all'}`;
    link.href = url;
    link.download = `${reportType}-${stamp}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    const [{jsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const isMarejesho = reportType === 'marejesho_sheet';
    const doc = new jsPDF({orientation: isMarejesho ? 'landscape' : 'portrait'});

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Viva Brightlife Microfinance', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(t(`reports.${reportType}`), 14, 22);
    doc.text(`${startDate || 'All'} to ${endDate || 'All'}`, 14, 27);

    const isMonthly = reportType === 'monthly_collection';
    const headers = isMarejesho
      ? [
          'Member',
          'Loan Number',
          'Type',
          'Disbursement Date',
          'Installment',
          'OS Balance',
          ...scheduleDates
        ]
      : isMonthly
        ? [
            'Month',
            'Expected',
            'Paid',
            'Gap',
            'Overdue Amount',
            'Due Count',
            'Paid Count',
            'Collection %'
          ]
        : ['Member', 'Loan Number', 'Type', 'Amount', 'OS Balance', 'Status'];

    const body = isMarejesho
      ? filteredMarejesho.map((row) => {
          const scheduleMap = new Map(row.schedules.map((s) => [s.expectedDate, s]));
          const scheduleCells = scheduleDates.map((date) => {
            const sched = scheduleMap.get(date);
            const value =
              sched && sched.paidAmount > 0
                ? sched.paidAmount
                : sched?.expectedAmount ?? '';
            return value ? formatNumber(Number(value)) : '';
          });
          return [
            row.memberName,
            row.loanNumber,
            row.loanType,
            row.disbursementDate,
            formatNumber(row.installmentAmount),
            formatNumber(row.outstandingBalance),
            ...scheduleCells
          ];
        })
      : isMonthly
        ? monthlySchedule.map((row) => [
            row.label,
            formatNumber(row.expected),
            formatNumber(row.paid),
            formatNumber(row.gap),
            formatNumber(row.overdueAmount),
            formatNumber(row.dueCount),
            formatNumber(row.paidCount),
            `${row.collectionRate.toFixed(1)}%`
          ])
        : rows.map((row) => [
            row.memberName,
            row.loanNumber,
            row.loanType,
            formatNumber(row.disbursementAmount),
            formatNumber(row.outstandingBalance),
            row.status
          ]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: 32,
      styles: {fontSize: 7, cellPadding: 2},
      headStyles: {fillColor: [17, 42, 61]}
    });

    const stamp = `${startDate || 'all'}_${endDate || 'all'}`;
    doc.save(`${reportType}-${stamp}.pdf`);
  };

  return (
    <section className="relative space-y-6 overflow-hidden">
      <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-primary/15 blur-2xl report-float" />
      <div className="absolute -bottom-20 left-1/3 h-44 w-72 rounded-full bg-amber-300/20 blur-2xl report-float" />

      <div className="relative flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-amber-100/40 p-5 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Reports Hub
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground font-[family:Georgia,serif]">
            {t('reports.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(`reports.${reportType}`)} · {startDate || 'All'} to {endDate || 'All'}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:shadow-md"
            onClick={downloadPdf}
          >
            <FileText size={16} /> PDF
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:shadow-md"
            onClick={downloadXlsx}
          >
            <FileSpreadsheet size={16} /> Excel (XLSX)
          </button>
        </div>
      </div>

      <div className="no-print grid gap-3 rounded-2xl border bg-card/80 p-4 backdrop-blur report-fade-up md:grid-cols-5">
        <div className="flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 text-xs text-slate-600 shadow-sm">
          <CalendarRange size={14} />
          <span className="font-semibold text-slate-800">Date Range</span>
        </div>
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
          className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-5"
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

      <div className="grid gap-4 report-stagger md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Total Disbursed
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground drop-shadow-sm">
            {formatCurrency(summary.totalDisbursed)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Average ticket {formatCurrency(summary.avgTicket)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Outstanding Balance
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground drop-shadow-sm">
            {formatCurrency(summary.totalOutstanding)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Active loans {formatNumber(summary.activeLoans)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Overdue Count
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground drop-shadow-sm">
            {formatNumber(summary.overdueLoans)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Defaulted {formatNumber(summary.defaultedLoans)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Schedule Coverage
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground drop-shadow-sm">
            {formatCurrency(scheduleSummary.paid)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Expected {formatCurrency(scheduleSummary.expected)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Monthly Collections
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground font-[family:Georgia,serif]">
              Expected vs Paid + Delays
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Collection rate{' '}
            {monthlyTotals.expected > 0
              ? `${((monthlyTotals.paid / monthlyTotals.expected) * 100).toFixed(1)}%`
              : '0.0%'}
          </span>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Expected</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Gap</th>
                <th className="px-3 py-2">Overdue</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Collection %</th>
              </tr>
            </thead>
            <tbody>
              {monthlySchedule.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    No schedule data for the selected range.
                  </td>
                </tr>
              ) : (
                monthlySchedule.map((row) => (
                  <tr key={row.month} className="border-t">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">{formatNumber(row.expected)}</td>
                    <td className="px-3 py-2">{formatNumber(row.paid)}</td>
                    <td className="px-3 py-2">{formatNumber(row.gap)}</td>
                    <td className="px-3 py-2">{formatNumber(row.overdueAmount)}</td>
                    <td className="px-3 py-2">{formatNumber(row.dueCount)}</td>
                    <td className="px-3 py-2">{formatNumber(row.paidCount)}</td>
                    <td className="px-3 py-2">
                      {row.collectionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
              {monthlySchedule.length > 0 ? (
                <tr className="border-t font-semibold">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2">{formatNumber(monthlyTotals.expected)}</td>
                  <td className="px-3 py-2">{formatNumber(monthlyTotals.paid)}</td>
                  <td className="px-3 py-2">{formatNumber(monthlyTotals.gap)}</td>
                  <td className="px-3 py-2">{formatNumber(monthlyTotals.overdueAmount)}</td>
                  <td className="px-3 py-2">{formatNumber(monthlyTotals.dueCount)}</td>
                  <td className="px-3 py-2">{formatNumber(monthlyTotals.paidCount)}</td>
                  <td className="px-3 py-2">
                    {monthlyTotals.expected > 0
                      ? `${((monthlyTotals.paid / monthlyTotals.expected) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Disbursement Trend
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground font-[family:Georgia,serif]">
                Last 6 Months
              </h3>
            </div>
            <BarChart3 className="text-muted-foreground" size={20} />
          </div>
          <div className="mt-4 grid h-44 grid-cols-6 items-end gap-2">
            {disbursementSeries.map((entry) => (
              <div key={entry.month} className="flex flex-col items-center gap-2">
                <div className="relative h-full w-full rounded-full bg-muted/70">
                  <div
                    className="absolute bottom-0 w-full rounded-full bg-primary/70"
                    style={{height: `${(entry.value / maxDisbursement) * 100}%`}}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{entry.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Status Mix
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground font-[family:Georgia,serif]">
                Loan Health
              </h3>
            </div>
            <PieChart className="text-muted-foreground" size={20} />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <svg viewBox="0 0 42 42" className="h-28 w-28">
              <circle
                cx="21"
                cy="21"
                r="15.9155"
                fill="transparent"
                stroke="hsl(var(--muted))"
                strokeWidth="6"
              />
              {statusSegments.map((segment) => (
                <circle
                  key={segment.item.label}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="transparent"
                  strokeWidth="6"
                  strokeDasharray={segment.dash}
                  strokeDashoffset={segment.offset}
                  stroke={segment.item.swatch}
                />
              ))}
            </svg>
            <div className="space-y-2">
              {statusBreakdown.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{backgroundColor: item.swatch}}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`ml-auto font-semibold ${item.textColor}`}>
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Portfolio Mix
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground font-[family:Georgia,serif]">
              Top Loan Types
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">By count</span>
        </div>
        <div className="mt-4 space-y-3">
          {typeBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for the filters selected.</p>
          ) : (
            typeBreakdown.map((item) => {
              const total = typeBreakdown.reduce((sum, entry) => sum + entry.value, 0) || 1;
              const width = (item.value / total) * 100;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>{item.label}</span>
                    <span>{formatNumber(item.value)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary/70"
                      style={{width: `${width}%`}}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 print-area shadow-sm">
        <div className="mb-4 border-b pb-3">
          <h2 className="text-xl font-semibold text-foreground font-[family:Georgia,serif]">
            Viva Brightlife Microfinance
          </h2>
          <p className="text-sm text-muted-foreground">{t(`reports.${reportType}`)}</p>
          <p className="text-xs text-muted-foreground">
            {startDate || 'All'} to {endDate || 'All'}
          </p>
        </div>
        {reportType === 'monthly_collection' ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/70 text-left">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Gap</th>
                  <th className="px-3 py-2">Overdue</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {monthlySchedule.map((row) => (
                  <tr key={row.month} className="border-t">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">{formatNumber(row.expected)}</td>
                    <td className="px-3 py-2">{formatNumber(row.paid)}</td>
                    <td className="px-3 py-2">{formatNumber(row.gap)}</td>
                    <td className="px-3 py-2">{formatNumber(row.overdueAmount)}</td>
                    <td className="px-3 py-2">{formatNumber(row.dueCount)}</td>
                    <td className="px-3 py-2">{formatNumber(row.paidCount)}</td>
                    <td className="px-3 py-2">
                      {row.collectionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {monthlySchedule.length > 0 ? (
                  <tr className="border-t font-semibold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2">{formatNumber(monthlyTotals.expected)}</td>
                    <td className="px-3 py-2">{formatNumber(monthlyTotals.paid)}</td>
                    <td className="px-3 py-2">{formatNumber(monthlyTotals.gap)}</td>
                    <td className="px-3 py-2">{formatNumber(monthlyTotals.overdueAmount)}</td>
                    <td className="px-3 py-2">{formatNumber(monthlyTotals.dueCount)}</td>
                    <td className="px-3 py-2">{formatNumber(monthlyTotals.paidCount)}</td>
                    <td className="px-3 py-2">
                      {monthlyTotals.expected > 0
                        ? `${((monthlyTotals.paid / monthlyTotals.expected) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : reportType === 'marejesho_sheet' ? (
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
