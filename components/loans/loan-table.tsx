'use client';

import {Fragment, useTransition, useState, useEffect, useCallback} from 'react';
import {Trash2, CalendarDays} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {LoanRecord, LoanType} from '@/types';
import {deleteLoanAction} from '@/lib/actions/loan';
import {LoanSchedulesDialog} from './loan-schedules-dialog';
import {LoanEditForm} from './loan-edit-form';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {useProfile} from '@/lib/hooks/use-profile';

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
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const isIndividual = loanType === 'binafsi';
  const [deleteTarget, setDeleteTarget] = useState<LoanRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {profile} = useProfile();
  const [permissionError, setPermissionError] = useState('');

  const addMonthsToIso = (isoDate: string, months: number) => {
    const base = new Date(isoDate);
    if (Number.isNaN(base.getTime()) || months <= 0) {
      return '-';
    }
    const d = new Date(base);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return d.toISOString().split('T')[0];
  };
  

  const exportCsv = useCallback(() => {
    const headers = isIndividual
      ? [
          'S/NO',
          'JINA',
          'KIASI CHA MKOPO',
          'TAREHE YA MKOPAJI',
          'TAREHE YA REJESHO',
          'IDADI YA SIKU ZA MALIMBIKIZO',
          'ASILIMIA YA RIBA',
          'RIBA',
          'MUDA WA MKOPO (MWEZI)',
          'MALIPO YA MKOPO',
          'MKOPO + REJESHO',
          'DENI',
          'NAMBA YA SIMU'
        ]
      : [
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

    const csvRows = rows.map((r, index) => {
      if (isIndividual) {
        const returnDate = addMonthsToIso(r.disbursementDate, r.cycle);
        const ratePercent =
          r.interestRate && r.interestRate > 0
            ? r.interestRate
            : r.disbursementAmount > 0
              ? (r.securityAmount / r.disbursementAmount) * 100
              : 0;
        const rateDecimal = ratePercent <= 1 ? ratePercent : ratePercent / 100;
        return [
          r.memberNumber,
          r.memberName,
          r.disbursementAmount,
          excelSafeDate(r.disbursementDate),
          returnDate,
          r.daysOverdue ?? 0,
          Number(rateDecimal.toFixed(2)),
          r.securityAmount,
          r.cycle,
          r.amountPaid ?? 0,
          r.installmentSize,
          r.outstandingBalance,
          r.memberPhone ?? ''
        ]
          .map(escapeCsv)
          .join(',');
      }

      return [
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
        .join(',');
    });

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
  }, [isIndividual, loanType, rows]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{loanType?: string}>).detail;
      if (detail?.loanType && detail.loanType !== loanType) {
        return;
      }
      exportCsv();
    };
    window.addEventListener('loan-export', handler as EventListener);
    return () => window.removeEventListener('loan-export', handler as EventListener);
  }, [exportCsv, loanType]);

  const handleDelete = (target: LoanRecord) => {
    if (profile?.role && profile.role !== 'admin') {
      setPermissionError(
        'Delete is restricted to admins. Please contact the admin for this action.'
      );
      return;
    }
    setDeleteTarget(target);
  };

  return (
    <>
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground no-print bg-background font-medium">
          Showing {rows.length} of {count}
        </span>
      </div>
      {permissionError ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {permissionError}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border bg-card relative">
        {isIndividual ? (
          <table className="min-w-[1600px] w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-3 py-2">{t('table.sno')}</th>
                <th className="px-3 py-2">{t('table.name')}</th>
                <th className="px-3 py-2">{t('table.loan_amount')}</th>
                <th className="px-3 py-2">{t('table.disbursement_date')}</th>
                <th className="px-3 py-2">{t('table.return_date')}</th>
                <th className="px-3 py-2">{t('table.days_overdue')}</th>
                <th className="px-3 py-2">{t('table.interest_rate')}</th>
                <th className="px-3 py-2">{t('table.interest_amount')}</th>
                <th className="px-3 py-2">{t('table.loan_duration_months')}</th>
                <th className="px-3 py-2">{t('table.amount_paid')}</th>
                <th className="px-3 py-2">{t('table.total_repay')}</th>
                <th className="px-3 py-2">{t('table.balance')}</th>
                <th className="px-3 py-2">{t('table.phone_number')}</th>
                <th className="px-3 py-2">MAREJESHO</th>
                <th className="px-3 py-2 no-print">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className={isPending ? 'opacity-50' : ''}>
              {rows.map((row, index) => {
                const returnDate = addMonthsToIso(row.disbursementDate, row.cycle);
                const isOverdue =
                  (row.daysOverdue ?? 0) > 0 || (row.overdueAmount ?? 0) > 0;
                const ratePercent =
                  row.interestRate && row.interestRate > 0
                    ? row.interestRate
                    : row.disbursementAmount > 0
                      ? (row.securityAmount / row.disbursementAmount) * 100
                      : 0;
                const rateDecimal =
                  ratePercent <= 1 ? ratePercent : ratePercent / 100;
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={`border-t ${
                        isOverdue
                          ? 'bg-red-50/70 hover:bg-red-50 dark:bg-red-950/35 dark:hover:bg-red-950/55'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span>{row.memberName}</span>
                          {isOverdue ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/60 dark:text-red-200">
                              Overdue
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">{currency.format(row.disbursementAmount)}</td>
                      <td className="px-3 py-2">{row.disbursementDate}</td>
                      <td className="px-3 py-2">{returnDate}</td>
                      <td className="px-3 py-2">{row.daysOverdue ?? 0}</td>
                      <td className="px-3 py-2">{rateDecimal}</td>
                      <td className="px-3 py-2">{currency.format(row.securityAmount)}</td>
                      <td className="px-3 py-2">{row.cycle}</td>
                      <td className="px-3 py-2">{currency.format(row.amountPaid ?? 0)}</td>
                      <td className="px-3 py-2">{currency.format(row.installmentSize)}</td>
                      <td className="px-3 py-2">{currency.format(row.outstandingBalance)}</td>
                      <td className="px-3 py-2">{row.memberPhone ?? '-'}</td>
                      <td className="px-3 py-2">
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                          onClick={() => setSelectedLoanId(row.id)}
                        >
                          <CalendarDays size={12} /> Marejesho
                        </button>
                      </td>
                      <td className="px-3 py-2 no-print">
                        <div className="flex gap-1">
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() =>
                              setEditingLoanId(editingLoanId === row.id ? null : row.id)
                            }
                          >
                            {t('buttons.edit')}
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-md border text-red-600 border-red-200 px-2 py-1 text-xs hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleDelete(row)}
                            disabled={profile?.role && profile.role !== 'admin'}
                          >
                            <Trash2 size={12} /> {t('buttons.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingLoanId === row.id ? (
                      <tr className="border-t bg-muted/20">
                        <td colSpan={15} className="px-3 py-3">
                          <LoanEditForm
                            loan={row}
                            onClose={() => setEditingLoanId(null)}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={15}>
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : (
          <table className="min-w-[1300px] w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-3 py-2">{t('table.number')}</th>
                <th className="px-3 py-2">{t('table.member_number')}</th>
                <th className="px-3 py-2">{t('table.member_name')}</th>
                <th className="px-3 py-2 hidden lg:table-cell">{t('table.cycle')}</th>
                <th className="px-3 py-2 hidden lg:table-cell">{t('table.security_amount')}</th>
                <th className="px-3 py-2">{t('table.loan_number')}</th>
                <th className="px-3 py-2">{t('table.disbursement_amount')}</th>
                <th className="px-3 py-2 hidden md:table-cell">{t('table.disbursement_date')}</th>
                <th className="px-3 py-2 hidden lg:table-cell">{t('table.installment_size')}</th>
                <th className="px-3 py-2">{t('table.os_balance')}</th>
                <th className="px-3 py-2 hidden md:table-cell">{t('table.overdue_od')}</th>
                <th className="px-3 py-2">MAREJESHO</th>
                <th className="px-3 py-2 hidden md:table-cell">{t('table.status')}</th>
                <th className="px-3 py-2 no-print">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className={isPending ? 'opacity-50' : ''}>
              {rows.map((row, index) => {
                const isOverdue = (row.overdueAmount ?? 0) > 0;
                return (
                <Fragment key={row.id}>
                  <tr
                    className={`border-t ${
                      isOverdue
                        ? 'bg-red-50/70 hover:bg-red-50 dark:bg-red-950/35 dark:hover:bg-red-950/55'
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2">{row.memberNumber}</td>
                    <td className="px-3 py-2">{row.memberNumber}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{row.memberName}</span>
                        {isOverdue ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/60 dark:text-red-200">
                            Overdue
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">{row.cycle}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{currency.format(row.securityAmount)}</td>
                    <td className="px-3 py-2">{row.loanNumber}</td>
                    <td className="px-3 py-2">{currency.format(row.disbursementAmount)}</td>
                    <td className="px-3 py-2 hidden md:table-cell">{row.disbursementDate}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{currency.format(row.installmentSize)}</td>
                    <td className="px-3 py-2">{currency.format(row.outstandingBalance)}</td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {currency.format(row.overdueAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <button 
                        className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => setSelectedLoanId(row.id)}
                      >
                        <CalendarDays size={12} /> Marejesho
                      </button>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell capitalize">{row.status}</td>
                    <td className="px-3 py-2 no-print">
                      <div className="flex gap-1">
                        <button
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          onClick={() =>
                            setEditingLoanId(editingLoanId === row.id ? null : row.id)
                          }
                        >
                          {t('buttons.edit')}
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded-md border text-red-600 border-red-200 px-2 py-1 text-xs hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleDelete(row)}
                          disabled={profile?.role && profile.role !== 'admin'}
                        >
                          <Trash2 size={12} /> {t('buttons.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingLoanId === row.id ? (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={14} className="px-3 py-3">
                        <LoanEditForm
                          loan={row}
                          onClose={() => setEditingLoanId(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )})}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={13}>
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {selectedLoanId && (
        <LoanSchedulesDialog
          loanId={selectedLoanId}
          loanType={loanType}
          onClose={() => setSelectedLoanId(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirm Deletion"
        description={
          deleteTarget
            ? `Delete loan for ${deleteTarget.memberName}? This action cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          setDeleting(true);
          startTransition(async () => {
            await deleteLoanAction(deleteTarget.id);
            setDeleting(false);
            setDeleteTarget(null);
          });
        }}
      />
    </>
  );
}
