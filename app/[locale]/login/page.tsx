import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {LoginForm} from './login-form';

export default async function LoginPage({params}: {params: {locale: string}}) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${params.locale}/dashboard`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <LoginForm />
    </div>
  );
}
