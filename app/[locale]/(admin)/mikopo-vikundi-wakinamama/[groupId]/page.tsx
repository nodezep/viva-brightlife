import {notFound} from 'next/navigation';
import {GroupMembersModule} from '@/components/loans/group-members-module';
import {getGroupDetail, getMembersForGroupSelection} from '@/lib/data';

export default async function GroupDetailsPage({
  params
}: {
  params: {groupId: string};
}) {
  const [group, members] = await Promise.all([
    getGroupDetail(params.groupId),
    getMembersForGroupSelection()
  ]);

  if (!group) {
    notFound();
  }

  return <GroupMembersModule group={group} allMembers={members} />;
}
