import {ReportsModule} from '@/components/reports/reports-module';
import {getAllLoans} from '@/lib/data';

export default async function RipotiPage() {
  const rows = await getAllLoans();
  return <ReportsModule initialRows={rows} />;
}