import {AdmissionBookModule} from '@/components/admission/admission-book-module';
import {getAdmissionBookRows, getAdmissionGroups} from '@/lib/data';

export default async function Page() {
  const [rows, groups] = await Promise.all([
    getAdmissionBookRows(),
    getAdmissionGroups()
  ]);
  return <AdmissionBookModule initialRows={rows} groups={groups} />;
}
