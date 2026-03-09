import {GroupsListModule} from '@/components/loans/groups-list-module';
import {getGroupsSummary} from '@/lib/data';

export default async function MikopoVikundiWakinamamaPage() {
  const groups = await getGroupsSummary();
  return <GroupsListModule initialGroups={groups} />;
}