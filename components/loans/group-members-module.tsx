'use client';

import {useState} from 'react';
import {ArrowLeft, Download, Plus, Printer, Trash2} from 'lucide-react';
import {useRouter} from '@/lib/navigation';
import type {GroupDetail, GroupMemberDetail} from '@/lib/data';
import type {LoanRecord} from '@/types';
import {LoanTable} from './loan-table';
import {GroupLoanFormDialog} from './group-loan-form-dialog';
import {getLoanSchedulesAction} from '@/lib/actions/loan-schedules';
import {useProfile} from '@/lib/hooks/use-profile';
import ExcelJS from 'exceljs';

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
  const [printDates, setPrintDates] = useState<string[]>([]);
  const [selectedPrintDates, setSelectedPrintDates] = useState<string[]>([]);
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

  const buildScheduleColumns = (schedulesByLoan: Map<string, any[]>) => {
    const [year, month] = exportMonth.split('-').map(Number);
    if (!year || !month) {
      return [];
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const dates = new Set<string>();
    schedulesByLoan.forEach((schedules) => {
      schedules.forEach((schedule) => {
        const date = schedule.expected_date;
        if (!date) return;
        const d = new Date(date);
        if (d >= start && d <= end) {
          dates.add(date);
        }
      });
    });
    const sorted = Array.from(dates).sort().slice(0, 4);
    while (sorted.length < 4) {
      sorted.push(`Week ${sorted.length + 1}`);
    }
    return sorted;
  };

  const buildPrintDates = (
    schedulesByLoan: Map<string, any[]>,
    monthValue: string
  ) => {
    const [year, month] = monthValue.split('-').map(Number);
    if (!year || !month) {
      return [];
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const dates = new Set<string>();
    schedulesByLoan.forEach((schedules) => {
      schedules.forEach((schedule) => {
        const date = schedule.expected_date;
        if (!date) return;
        const d = new Date(date);
        if (d >= start && d <= end) {
          dates.add(date);
        }
      });
    });
    const sorted = Array.from(dates).sort();
    if (sorted.length > 0) {
      return sorted;
    }
    const fallback = [];
    for (let i = 0; i < 4; i += 1) {
      const d = new Date(year, month - 1, 1 + i * 7);
      fallback.push(d.toISOString().split('T')[0]);
    }
    return fallback;
  };

  const loadPrintData = async (monthValue: string, force = false) => {
    if (printLoading) {
      return;
    }
    if (!force && printMonth === monthValue && printDates.length > 0) {
      return;
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
    const dates = buildPrintDates(scheduleMap, monthValue);
    setPrintDates(dates);
    setSelectedPrintDates([]);
    setPrintMonth(monthValue);
    setPrintLoading(false);
  };

  const exportGroupLoans = async () => {
    if (loans.length === 0) {
      return;
    }

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
    const columns = buildScheduleColumns(scheduleMap);
    const rows = loans.map((loan) => ({
      memberName: loan.memberName,
      loanNumber: loan.loanNumber,
      loanAmount: loan.disbursementAmount,
      installment: loan.installmentSize,
      outstanding: loan.outstandingBalance,
      scheduleMap: new Map(
        (scheduleMap.get(loan.id) ?? []).map((row: any) => [row.expected_date, row])
      )
    }));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Women Group Loans');

    sheet.mergeCells('A1', 'I1');
    sheet.getCell('A1').value = `Viva Brightlife Microfinance - ${group.groupName}`;
    sheet.getCell('A1').font = {size: 14, bold: true};
    sheet.getCell('A1').alignment = {vertical: 'middle'};

    sheet.mergeCells('A2', 'I2');
    sheet.getCell('A2').value = `Group Number: ${group.groupNumber} | Month: ${exportMonth}`;
    sheet.getCell('A2').font = {size: 11, color: {argb: '6B7280'}};

    const headerRow = [
      'Member',
      'Loan Number',
      'Loan Amount',
      'Installment',
      'OS Balance',
      ...columns
    ];
    const header = sheet.addRow(headerRow);
    header.font = {bold: true, color: {argb: 'FFFFFF'}};
    header.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: '1F2937'}};
    header.alignment = {vertical: 'middle'};

    const numberFormat = '#,##0';
    rows.forEach((row) => {
      const scheduleValues = columns.map((date) => {
        const schedule = row.scheduleMap.get(date);
        if (!schedule) {
          return '-';
        }
        const value =
          schedule.paid_amount && schedule.paid_amount > 0
            ? schedule.paid_amount
            : schedule.expected_amount ?? 0;
        return value ? Number(value) : '-';
      });
      const dataRow = sheet.addRow([
        row.memberName,
        row.loanNumber,
        Number(row.loanAmount ?? 0),
        Number(row.installment ?? 0),
        Number(row.outstanding ?? 0),
        ...scheduleValues
      ]);

      dataRow.getCell(3).numFmt = numberFormat;
      dataRow.getCell(4).numFmt = numberFormat;
      dataRow.getCell(5).numFmt = numberFormat;
      scheduleValues.forEach((value, idx) => {
        if (typeof value === 'number') {
          dataRow.getCell(6 + idx).numFmt = numberFormat;
        }
      });
    });

    sheet.columns = headerRow.map((label) => ({
      header: label,
      key: label,
      width: Math.max(14, Math.min(24, label.length + 2))
    }));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `women-groups-${group.groupName}-${exportMonth}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                  setPrintDates([]);
                  setSelectedPrintDates([]);
                  setPrintMonth('');
                }}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                onClick={() => void loadPrintData(exportMonth, true)}
                disabled={printLoading}
              >
                {printLoading ? 'Loading dates...' : 'Load Dates'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                onClick={async () => {
                  if (printDates.length === 0 || printMonth !== exportMonth) {
                    await loadPrintData(exportMonth, true);
                    return;
                  }
                  setTimeout(() => window.print(), 120);
                }}
                disabled={selectedPrintDates.length === 0}
              >
                <Printer size={16} /> Print
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                onClick={() => void exportGroupLoans()}
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>
          <div className="no-print rounded-xl border bg-card p-3">
            <p className="text-sm font-medium text-foreground">Select dates to print</p>
            <p className="text-xs text-muted-foreground">
              Click "Load Dates" after choosing the month, then select the dates.
            </p>
            {printDates.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                  onClick={() => setSelectedPrintDates(printDates)}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                  onClick={() => setSelectedPrintDates([])}
                >
                  Clear
                </button>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {printDates.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  No dates loaded yet.
                </span>
              ) : (
                printDates.map((date) => {
                  const checked = selectedPrintDates.includes(date);
                  return (
                    <label
                      key={date}
                      className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedPrintDates((current) =>
                            e.target.checked
                              ? [...current, date]
                              : current.filter((item) => item !== date)
                          );
                        }}
                      />
                      {formatDateLabel(date)}
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <div className="print-only space-y-3">
            <div className="rounded-xl border bg-card p-3">
              <div className="text-sm font-semibold">
                Viva Brightlife Microfinance - {group.groupName}
              </div>
              <div className="text-xs text-muted-foreground">
                Group Number: {group.groupNumber} | Month: {exportMonth}
              </div>
            </div>
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="min-w-[1200px] w-full text-xs">
                <thead className="bg-muted/70 text-left">
                  <tr>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Loan Number</th>
                    <th className="px-3 py-2">Loan Amount</th>
                    <th className="px-3 py-2">Installment</th>
                    <th className="px-3 py-2">OS Balance</th>
                    {(selectedPrintDates.length > 0
                      ? selectedPrintDates
                      : printDates
                    ).map((date) => (
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
                      {(selectedPrintDates.length > 0
                        ? selectedPrintDates
                        : printDates
                      ).map((date) => (
                        <td key={`${loan.id}-${date}`} className="px-3 py-2">
                          {'\u00A0'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {loans.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-6 text-center text-muted-foreground"
                        colSpan={
                          5 +
                          (selectedPrintDates.length > 0
                            ? selectedPrintDates.length
                            : printDates.length)
                        }
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
