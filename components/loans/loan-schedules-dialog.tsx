'use client';

import {useState, useEffect, useTransition} from 'react';
import {X} from 'lucide-react';
import {getLoanSchedulesAction, updateScheduleStatusAction} from '@/lib/actions/loan-schedules';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/lib/navigation';

type Props = {
  loanId: string;
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

export function LoanSchedulesDialog({loanId, onClose}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getLoanSchedulesAction(loanId);
      setSchedules(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'Failed to connect to the database. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSchedules();
  }, [loanId]);

  const handleUpdate = (scheduleId: string, currentStatus: string, expectedAmt: number) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const paidAmount = newStatus === 'paid' ? expectedAmt : 0;
    
    // Optimistic update
    setSchedules(prev => prev.map(s => 
      s.id === scheduleId ? {...s, status: newStatus, paid_amount: paidAmount} : s
    ));
    
    startTransition(async () => {
      const result = await updateScheduleStatusAction(scheduleId, newStatus);
      if (result.error) {
        // Revert on error
        void fetchSchedules();
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Marejesho (Repayments Schedule)</h2>
            <p className="text-sm text-muted-foreground">Manage weekly installment tracking</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">Week</th>
                <th className="px-4 py-3 font-semibold">Expected Date</th>
                <th className="px-4 py-3 font-semibold">Expected Amount</th>
                <th className="px-4 py-3 font-semibold">Paid Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading schedules...
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-500 font-medium">
                    ⚠️ {errorMsg}
                    <br/>
                    <span className="text-sm font-normal text-muted-foreground mt-2 inline-block">
                      Hint: Check your internet connection or verify if your Supabase project is currently awake.
                    </span>
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No schedule found for this loan. You may need to run database migrations.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{schedule.week_number}</td>
                    <td className="px-4 py-3">{schedule.expected_date}</td>
                    <td className="px-4 py-3">
                      {new Intl.NumberFormat('en-US', {style: 'currency', currency: 'TZS', maximumFractionDigits: 0}).format(schedule.expected_amount)}
                    </td>
                    <td className="px-4 py-3">
                      {new Intl.NumberFormat('en-US', {style: 'currency', currency: 'TZS', maximumFractionDigits: 0}).format(schedule.paid_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        schedule.status === 'paid' ? 'bg-green-100 text-green-700' :
                        schedule.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        schedule.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUpdate(schedule.id, schedule.status, schedule.expected_amount)}
                        disabled={isPending}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          schedule.status === 'paid' 
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {schedule.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
