import {notFound} from 'next/navigation';
import {GroupMembersModule} from '@/components/loans/group-members-module';
import {getGroupDetail, getMembersForGroupSelection, getLoansByGroup} from '@/lib/data';

export default async function GroupDetailsPage({
  params
}: {
  params: {groupId: string};
}) {
  const [group, members, loans] = await Promise.all([
    getGroupDetail(params.groupId),
    getMembersForGroupSelection(),
    getLoansByGroup(params.groupId)
  ]);

  if (!group) {
    notFound();
  }

  return <GroupMembersModule group={group} allMembers={members} loans={loans} />;
}
