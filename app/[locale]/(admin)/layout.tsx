import {redirect} from 'next/navigation';
import {AdminShell} from '@/components/layout/admin-shell';
import {createClient} from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  return (
    <AdminShell adminEmail={user.email ?? 'admin@brightlife.co.tz'}>
      {children}
    </AdminShell>
  );
}
