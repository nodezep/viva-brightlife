'use client';

import {useMemo, useState} from 'react';
import {ArrowLeft, Download, Plus, Printer, Trash2} from 'lucide-react';
import {useRouter} from '@/lib/navigation';
import type {GroupDetail, GroupMemberDetail} from '@/lib/data';
import type {LoanRecord} from '@/types';
import {LoanTable} from './loan-table';
import {GroupLoanFormDialog} from './group-loan-form-dialog';
import {getLoanSchedulesAction} from '@/lib/actions/loan-schedules';
import {useProfile} from '@/lib/hooks/use-profile';

type Props = {
  group: GroupDetail;
  loans: LoanRecord[];
};

export function GroupMembersModule({group, loans}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<GroupMemberDetail[]>(group.members);
  const [showNewRow, setShowNewRow] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberNumber, setNewMemberNumber] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'members' | 'loans'>('members');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('Member');
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const {profile} = useProfile();
  const [permissionError, setPermissionError] = useState('');
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  });
  const [printSchedules, setPrintSchedules] = useState<Map<string, Map<string, any>>>(
    new Map()
  );
  const [printLoading, setPrintLoading] = useState(false);
  const [printMonth, setPrintMonth] = useState('');

  const addMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newMemberName) {
      setError('Enter member name first.');
      return;
    }

    setSubmitting(true);
    setError('');

    const response = await fetch(`/api/groups/${group.id}/members`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        memberNumber: newMemberNumber,
        fullName: newMemberName,
        phone: newMemberPhone,
        roleInGroup: newMemberRole
      })
    });

    const result = await response.json();
    if (!response.ok) {
      const message =
        typeof result.error === 'string'
          ? result.error
          : result.error?.message ??
            (result.error ? JSON.stringify(result.error) : null);
      setError(message ?? 'Failed to add member');
      setSubmitting(false);
      return;
    }

    const created = result.member as {
      id: string;
      member_number: string;
      full_name: string;
      phone: string | null;
    } | null;

    if (created) {
      setMembers((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          memberId: created.id,
          memberNumber: created.member_number,
          fullName: created.full_name,
          phone: created.phone ?? null,
          roleInGroup: newMemberRole,
          hasBook: false
        }
      ]);
    }

    setNewMemberName('');
    setNewMemberNumber('');
    setNewMemberPhone('');
    setNewMemberRole('Member');
    setSubmitting(false);
    setShowNewRow(false);
    router.refresh();
  };

  const startEdit = (member: GroupMemberDetail) => {
    setEditingMemberId(member.memberId);
    setEditName(member.fullName);
    setEditNumber(member.memberNumber ?? '');
    setEditPhone(member.phone ?? '');
    setEditRole(member.roleInGroup ?? 'Member');
  };

  const cancelEdit = () => {
    setEditingMemberId(null);
    setEditName('');
    setEditNumber('');
    setEditPhone('');
    setEditRole('Member');
  };

  const saveEdit = async (memberId: string) => {
    if (!editName) {
      setError('Member name is required.');
      return;
    }

    setSavingMemberId(memberId);
    setError('');

    const response = await fetch(`/api/groups/${group.id}/members`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        memberId,
        memberNumber: editNumber,
        fullName: editName,
        phone: editPhone,
        roleInGroup: editRole
      })
    });

    const result = await response.json();
    if (!response.ok) {
      const message =
        typeof result.error === 'string'
          ? result.error
          : result.error?.message ??
            (result.error ? JSON.stringify(result.error) : null);
      setError(message ?? 'Failed to update member');
      setSavingMemberId(null);
      return;
    }

    const updated = result.member as {
      id: string;
      member_number: string;
      full_name: string;
      phone: string | null;
    } | null;

    if (updated) {
      setMembers((current) =>
        current.map((member) =>
          member.memberId === memberId
            ? {
                ...member,
                memberNumber: updated.member_number,
                fullName: updated.full_name,
                phone: updated.phone ?? null,
                roleInGroup: result.roleInGroup ?? editRole
              }
            : member
        )
      );
    }

    setSavingMemberId(null);
    cancelEdit();
    router.refresh();
  };

  const removeMember = async (memberId: string) => {
    if (profile?.role && profile.role !== 'admin') {
      setPermissionError(
        'Delete is restricted to admins. Please contact the admin for this action.'
      );
      return;
    }
    const response = await fetch(`/api/groups/${group.id}/members?memberId=${memberId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      return;
    }

    setMembers((current) => current.filter((member) => member.memberId !== memberId));
    router.refresh();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(value);

  const addDaysToIso = (isoDate: string, days: number) => {
    const base = new Date(isoDate);
    if (Number.isNaN(base.getTime())) {
      return '';
    }
    base.setDate(base.getDate() + days);
    return base.toISOString().split('T')[0];
  };

  const getLoanStartDate = (loan: LoanRecord) =>
    loan.returnStartDate ??
    addDaysToIso(
      loan.disbursementDate,
      loan.repaymentFrequency === 'daily' ? 1 : 7
    );

  const getExpectedAmount = (
    loan: LoanRecord,
    date: string,
    schedulesMap: Map<string, Map<string, any>>
  ) => {
    const loanStartDate = getLoanStartDate(loan);
    if (loanStartDate && date < loanStartDate) {
      return '-';
    }
    const schedule = schedulesMap.get(loan.id)?.get(date);
    const expected =
      schedule?.expected_amount ?? schedule?.expectedAmount ?? loan.installmentSize;
    return expected ? formatNumber(Number(expected)) : '';
  };


  const getExpectedAmountValue = (
    loan: LoanRecord,
    date: string,
    schedulesMap: Map<string, Map<string, any>>
  ) => {
    const loanStartDate = getLoanStartDate(loan);
    if (loanStartDate && date < loanStartDate) {
      return 0;
    }
    const schedule = schedulesMap.get(loan.id)?.get(date);
    const expected =
      schedule?.expected_amount ?? schedule?.expectedAmount ?? loan.installmentSize;
    const numeric = Number(expected);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const formatDateLabel = (value: string) => {
    if (!value || value.startsWith('Week')) {
      return value;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit'});
  };

  const buildMonthlyWeeklyDates = (monthValue: string, startDateValue: string) => {
    const [year, month] = monthValue.split('-').map(Number);
    if (!year || !month || !startDateValue) {
      return [];
    }
    const start = new Date(startDateValue);
    if (Number.isNaN(start.getTime())) {
      return [];
    }
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const dates: Date[] = [];

    const forward: Date[] = [];
    for (let i = 0; i < 4; i += 1) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      if (d >= monthStart && d <= monthEnd) {
        forward.push(d);
      }
    }

    const backward: Date[] = [];
    let step = 1;
    while (forward.length + backward.length < 4) {
      const d = new Date(start);
      d.setDate(d.getDate() - step * 7);
      if (d >= monthStart && d <= monthEnd) {
        backward.push(d);
      } else {
        break;
      }
      step += 1;
    }

    dates.push(...backward.reverse(), ...forward);
    return dates
      .filter((d) => d >= monthStart && d <= monthEnd)
      .map((d) => d.toISOString().split('T')[0]);
  };

  const groupStartDate = useMemo(() => {
    const dates = loans
      .map((loan) => getLoanStartDate(loan))
      .filter(Boolean)
      .sort();
    return dates[0] ?? '';
  }, [loans]);

  const printDates = useMemo(
    () => buildMonthlyWeeklyDates(exportMonth, groupStartDate),
    [exportMonth, groupStartDate]
  );

  const loadPrintData = async (monthValue: string, force = false) => {
    if (printLoading) {
      return null;
    }
    if (!force && printMonth === monthValue && printSchedules.size > 0) {
      return {
        schedules: printSchedules
      };
    }
    setPrintLoading(true);
    const schedules: Array<[string, any[]]> = await Promise.all(
      loans.map(async (loan) => {
        try {
          const data = await getLoanSchedulesAction(loan.id);
          return [loan.id, (data ?? []) as any[]];
        } catch {
          return [loan.id, []];
        }
      })
    );
    const scheduleMap = new Map(schedules);
    const loanScheduleMaps = new Map(
      schedules.map(([loanId, entries]) => [
        loanId,
        new Map((entries ?? []).map((row: any) => [row.expected_date, row]))
      ])
    );
    setPrintSchedules(loanScheduleMaps);
    setPrintMonth(monthValue);
    setPrintLoading(false);
    return {
      schedules: loanScheduleMaps
    };
  };

  const exportGroupLoansPdf = async () => {
    if (loans.length === 0) {
      return;
    }
    if (printDates.length === 0) {
      return;
    }

    const snapshot =
      printSchedules.size > 0
        ? {schedules: printSchedules}
        : await loadPrintData(exportMonth, true);
    const schedulesSource = snapshot?.schedules ?? new Map();

    const [{jsPDF}, {default: autoTable}] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF({orientation: 'landscape'});
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Viva Brightlife Microfinance - ${group.groupName}`, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Group Number: ${group.groupNumber} | Month: ${exportMonth}`, 14, 22);

    const headers = [
      'Member',
      'Loan Number',
      'Loan Amount',
      'Installment',
      'OS Balance',
      ...printDates.map(formatDateLabel)
    ];

    const body = loans.map((loan) => [
      loan.memberName,
      loan.loanNumber,
      formatNumber(loan.disbursementAmount),
      formatNumber(loan.installmentSize),
      formatNumber(loan.outstandingBalance),
      ...printDates.map((date) => getExpectedAmount(loan, date, schedulesSource))
    ]);

    const totalsRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      ...printDates.map((date) => {
        if (groupStartDate && date < groupStartDate) {
          return '-';
        }
        const total = loans.reduce(
          (sum, loan) => sum + getExpectedAmountValue(loan, date, schedulesSource),
          0
        );
        return total ? formatNumber(total) : '';
      })
    ];

    const signatureRows = [
      [
        'JINA LA MHASIBU: _____________________________________________  ',
        '',
        '',
        '',
        'SAHIHI (MHASIBU)',
        ...printDates.map(() => '________')
      ],
      ['JINA LA C.O: __________________________________________ ', '', '', '', ' SAHIHI (C.O)', ...printDates.map(() => '________')]
    ];

    autoTable(doc, {
      head: [headers],
      body: [...body, totalsRow, ...signatureRows],
      startY: 42,
      styles: {fontSize: 7, cellPadding: 2},
      headStyles: {fillColor: [10, 32, 59]},
      alternateRowStyles: {fillColor: [217, 232, 255]},
      didParseCell: (data) => {
        if (data.row.index === body.length) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    doc.save(`women-groups-${group.groupName}-${exportMonth}.pdf`);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <button
            type="button"
            onClick={() => router.push('/mikopo-vikundi-wakinamama')}
            className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            <ArrowLeft size={14} /> Back to Groups
          </button>
          <h1 className="text-xl font-semibold">{group.groupName}</h1>
          <p className="text-sm text-muted-foreground">{group.groupNumber}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('members')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              view === 'members'
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/10 text-primary hover:opacity-80'
            }`}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setView('loans')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              view === 'loans'
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/10 text-primary hover:opacity-80'
            }`}
          >
            Loans
          </button>
        </div>
      </div>

      {view === 'members' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Group Members</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {permissionError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {permissionError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setShowNewRow((value) => !value)}
                className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
              >
                <Plus size={16} /> {showNewRow ? 'Close Form' : 'Add New Member'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/70 text-left">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Member Number</th>
                  <th className="px-3 py-2">Member Name</th>
                  <th className="px-3 py-2 hidden md:table-cell">Phone</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {showNewRow ? (
                  <tr className="border-t bg-muted/40">
                    <td className="px-3 py-2 text-sm text-muted-foreground">New</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberNumber}
                        onChange={(e) => setNewMemberNumber(e.target.value)}
                        placeholder="e.g. M-001"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="Member name"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        placeholder="Phone"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="Role"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <form onSubmit={addMember} className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        >
                          <Plus size={12} /> {submitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewRow(false)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : null}
                {members.map((member, index) => (
                  <tr key={member.memberId} className="border-t">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          placeholder={member.memberNumber}
                        />
                      ) : (
                        member.memberNumber
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        member.fullName
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      ) : (
                        member.phone ?? '-'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                        />
                      ) : (
                        member.roleInGroup ?? 'Member'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingMemberId === member.memberId ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingMemberId === member.memberId}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            onClick={() => void saveEdit(member.memberId)}
                          >
                            {savingMemberId === member.memberId ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            onClick={() => startEdit(member)}
                          >
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void removeMember(member.memberId)}
                            disabled={profile?.role && profile.role !== 'admin'}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                      No members in this group yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2">
            <GroupLoanFormDialog groupId={group.id} members={group.members} />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                className="rounded-lg border bg-background px-3 py-2 text-sm"
                value={exportMonth}
                onChange={(e) => {
                  setExportMonth(e.target.value);
                  setPrintSchedules(new Map());
                  setPrintMonth('');
                }}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                onClick={async () => {
                  if (printSchedules.size === 0 || printMonth !== exportMonth) {
                    await loadPrintData(exportMonth, true);
                  }
                  setTimeout(() => window.print(), 120);
                }}
                disabled={printDates.length === 0 || !groupStartDate}
              >
                <Printer size={16} /> Print
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                onClick={async () => {
                  if (printSchedules.size === 0 || printMonth !== exportMonth) {
                    await loadPrintData(exportMonth, true);
                  }
                  void exportGroupLoansPdf();
                }}
                disabled={printDates.length === 0 || !groupStartDate}
              >
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>
          <div className="no-print rounded-xl border bg-card p-3">
            <p className="text-sm font-medium text-foreground">Monthly print logic</p>
            <p className="text-xs text-muted-foreground">
              Choose the month. The sheet uses each loan's return start date to build
              four weekly dates for the month, and dates before a loan starts show
              a hyphen.
            </p>
          </div>
          <div className="print-only print-pdf space-y-0">
            <div className="print-header rounded-xl border bg-slate-900 text-white p-3">
              <div className="text-sm font-semibold">
                Viva Brightlife Microfinance - {group.groupName}
              </div>
              <div className="text-xs text-slate-200">
                Group Number: {group.groupNumber} | Month: {exportMonth}
              </div>
            </div>
            <div className="print-table rounded-xl border bg-card overflow-x-auto print-fit -mt-1">
              <table className="min-w-[1200px] w-full text-xs table-fixed">
                <thead className="bg-slate-900 text-white text-left">
                  <tr>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Loan Number</th>
                    <th className="px-3 py-2">Loan Amount</th>
                    <th className="px-3 py-2">Installment</th>
                    <th className="px-3 py-2">OS Balance</th>
                    {printDates.map((date) => (
                      <th key={date} className="px-3 py-2">
                        {formatDateLabel(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-t">
                      <td className="px-3 py-2">{loan.memberName}</td>
                      <td className="px-3 py-2">{loan.loanNumber}</td>
                      <td className="px-3 py-2">{formatCurrency(loan.disbursementAmount)}</td>
                      <td className="px-3 py-2">{formatCurrency(loan.installmentSize)}</td>
                      <td className="px-3 py-2">{formatCurrency(loan.outstandingBalance)}</td>
                      {printDates.map((date) => (
                        <td key={`${loan.id}-${date}`} className="px-3 py-2">
                          {getExpectedAmount(loan, date, printSchedules)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {loans.length > 0 ? (
                    <tr className="border-t font-semibold">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      {printDates.map((date) => {
                        const total = loans.reduce(
                          (sum, loan) =>
                            sum + getExpectedAmountValue(loan, date, printSchedules),
                          0
                        );
                        return (
                          <td key={`total-${date}`} className="px-3 py-2">
                            {groupStartDate && date < groupStartDate
                              ? '-'
                              : total
                                ? formatNumber(total)
                                : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ) : null}
                  {loans.length > 0 ? (
                    <>
                      <tr className="border-t">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">JINA LA MHASIBU:</span>
                            <span className="inline-block w-32 border-b border-slate-400" />
                            <span className="font-semibold">SAHIHI (MHASIBU)</span>
                          </div>
                        </td>
                        {printDates.map((date) => (
                          <td key={`mh-${date}`} className="px-3 py-2">
                            <span className="inline-block w-full border-b border-slate-400" />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">JINA LA C.O:</span>
                            <span className="inline-block w-32 border-b border-slate-400" />
                            <span className="font-semibold">SAHIHI (C.O)</span>
                          </div>
                        </td>
                        {printDates.map((date) => (
                          <td key={`co-${date}`} className="px-3 py-2">
                            <span className="inline-block w-full border-b border-slate-400" />
                          </td>
                        ))}
                      </tr>
                    </>
                  ) : null}
                  {loans.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-6 text-center text-muted-foreground"
                        colSpan={5 + printDates.length}
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            
          </div>
          <div className="no-print">
            <LoanTable loanType="vikundi_wakinamama" rows={loans} count={loans.length} />
          </div>
        </>
      )}
    </section>
  );
}
