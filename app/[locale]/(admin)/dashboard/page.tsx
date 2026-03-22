import {DashboardOverview} from '@/components/loans/dashboard-overview';
import {getDashboardMetrics} from '@/lib/data';

export const dynamic = 'force-dynamic';

type SearchParams = {
  range?: string;
  month?: string;
  week?: string;
};

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const getCurrentWeekKey = () => {
    const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  };
  const range =
    searchParams?.range === 'month'
      ? 'month'
      : searchParams?.range === 'week'
        ? 'week'
        : 'all';
  const month =
    searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : defaultMonth;
  const week =
    searchParams?.week && /^\d{4}-W\d{2}$/.test(searchParams.week)
      ? searchParams.week
      : getCurrentWeekKey();

  const metrics = await getDashboardMetrics({range, month, week});
  return (
    <DashboardOverview metrics={metrics} range={range} month={month} week={week} />
  );
}
