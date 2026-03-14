import {DashboardOverview} from '@/components/loans/dashboard-overview';
import {getDashboardMetrics} from '@/lib/data';

type SearchParams = {
  range?: string;
  month?: string;
};

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const range = searchParams?.range === 'month' ? 'month' : 'all';
  const month =
    searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : defaultMonth;

  const metrics = await getDashboardMetrics({range, month});
  return <DashboardOverview metrics={metrics} range={range} month={month} />;
}
