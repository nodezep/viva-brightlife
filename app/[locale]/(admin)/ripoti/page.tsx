import {ReportsModule} from '@/components/reports/reports-module';
import {getAllLoans, getMarejeshoReportRows} from '@/lib/data';

export default async function RipotiPage() {
  const [rows, marejeshoRows] = await Promise.all([
    getAllLoans(),
    getMarejeshoReportRows()
  ]);
  return <ReportsModule initialRows={rows} marejeshoRows={marejeshoRows} />;
}
