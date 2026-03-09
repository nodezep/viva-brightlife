import {DashboardOverview} from '@/components/loans/dashboard-overview';
import {getDashboardMetrics} from '@/lib/data';

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  return <DashboardOverview metrics={metrics} />;
}