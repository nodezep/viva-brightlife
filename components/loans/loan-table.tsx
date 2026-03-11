'use client';

import {useTransition, useState} from 'react';
import {Trash2, Download, CalendarDays} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {LoanRecord, LoanType} from '@/types';
import {deleteLoanAction} from '@/lib/actions/loan';
import {LoanSchedulesDialog} from './loan-schedules-dialog';
import {LoanEditForm} from './loan-edit-form';

type Props = {
  loanType: LoanType;
  rows: LoanRecord[];
  count: number;
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0
});

export function LoanTable({loanType, rows, count}: Props) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);

  const exportCsv = () => {
    const headers = [
      'number',
      'member_number',
      'member_name',
      'cycle',
      'security_amount',
      'loan_number',
      'disbursement_amount',
      'disbursement_date',
      'installment_size',
      'os_balance',
      'overdue_od',
      'status'
    ];

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '');
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const excelSafeDate = (date: string) => `'${date}`;

    const csvRows = rows.map((r, index) =>
      [
        index + 1,
        r.memberNumber,
        r.memberName,
        r.cycle,
        r.securityAmount,
        r.loanNumber,
        r.disbursementAmount,
        excelSafeDate(r.disbursementDate),
        r.installmentSize,
        r.outstandingBalance,
        r.overdueAmount,
        r.status
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvContent = [headers.map(escapeCsv).join(','), ...csvRows].join('\r\n');
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${loanType}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      startTransition(() => {
        deleteLoanAction(id);
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground no-print bg-background font-medium">
          Showing {rows.length} of {count}
        </span>
        <button
          className="no-print inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          onClick={exportCsv}
        >
          <Download size={16} /> {t('buttons.export')}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card relative">
        <table className="min-w-[1300px] w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">{t('table.number')}</th>
              <th className="px-3 py-2">{t('table.member_number')}</th>
              <th className="px-3 py-2">{t('table.member_name')}</th>
              <th className="px-3 py-2">{t('table.cycle')}</th>
              <th className="px-3 py-2">{t('table.security_amount')}</th>
              <th className="px-3 py-2">{t('table.loan_number')}</th>
              <th className="px-3 py-2">{t('table.disbursement_amount')}</th>
              <th className="px-3 py-2">{t('table.disbursement_date')}</th>
              <th className="px-3 py-2">{t('table.installment_size')}</th>
              <th className="px-3 py-2">{t('table.os_balance')}</th>
              <th className="px-3 py-2">{t('table.overdue_od')}</th>
              <th className="px-3 py-2">MAREJESHO</th>
              <th className="px-3 py-2">{t('table.status')}</th>
              <th className="px-3 py-2 no-print">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className={isPending ? 'opacity-50' : ''}>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{row.memberNumber}</td>
                <td className="px-3 py-2">{row.memberName}</td>
                <td className="px-3 py-2">{row.cycle}</td>
                <td className="px-3 py-2">{currency.format(row.securityAmount)}</td>
                <td className="px-3 py-2">{row.loanNumber}</td>
                <td className="px-3 py-2">{currency.format(row.disbursementAmount)}</td>
                <td className="px-3 py-2">{row.disbursementDate}</td>
                <td className="px-3 py-2">{currency.format(row.installmentSize)}</td>
                <td className="px-3 py-2">{currency.format(row.outstandingBalance)}</td>
                <td className="px-3 py-2">{currency.format(row.overdueAmount)}</td>
                <td className="px-3 py-2">
                  <button 
                    className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => setSelectedLoanId(row.id)}
                  >
                    <CalendarDays size={12} /> Marejesho
                  </button>
                </td>
                <td className="px-3 py-2 capitalize">{row.status}</td>
                <td className="px-3 py-2 no-print">
                  <div className="flex gap-1">
                    <button
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => setEditingLoan(row)}
                    >
                      {t('buttons.edit')}
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-md border text-red-600 border-red-200 px-2 py-1 text-xs hover:bg-red-50"
                      onClick={() => void handleDelete(row.id)}
                    >
                      <Trash2 size={12} /> {t('buttons.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={13}>
                  No records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedLoanId && (
        <LoanSchedulesDialog
          loanId={selectedLoanId}
          onClose={() => setSelectedLoanId(null)}
        />
      )}

      {editingLoan ? (
        <div className="mt-4">
          <LoanEditForm loan={editingLoan} onClose={() => setEditingLoan(null)} />
        </div>
      ) : null}
    </>
  );
}
