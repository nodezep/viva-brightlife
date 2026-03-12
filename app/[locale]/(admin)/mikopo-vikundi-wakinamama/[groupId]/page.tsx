import {notFound} from 'next/navigation';
import {GroupMembersModule} from '@/components/loans/group-members-module';
import {getGroupDetail, getLoansByGroup} from '@/lib/data';

export default async function GroupDetailsPage({
  params
}: {
  params: {groupId: string};
}) {
  const [group, loans] = await Promise.all([
    getGroupDetail(params.groupId),
    getLoansByGroup(params.groupId)
  ]);

  if (!group) {
    notFound();
  }

  return <GroupMembersModule group={group} loans={loans} />;
}
