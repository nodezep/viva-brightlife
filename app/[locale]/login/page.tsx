import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {LoginForm} from './login-form';
import {BrandLogo} from '@/components/layout/brand-logo';
import {ThemeToggle} from '@/components/layout/theme-toggle';

export default async function LoginPage({params}: {params: {locale: string}}) {
  const supabase = createClient();
  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${params.locale}/dashboard`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(7,112,148,0.20),_transparent_48%),radial-gradient(circle_at_20%_80%,_rgba(244,162,97,0.25),_transparent_50%),linear-gradient(135deg,_#f8f4ea,_#eef5f9_55%,_#f6efe2)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_48%),radial-gradient(circle_at_20%_80%,_rgba(251,191,36,0.12),_transparent_50%),linear-gradient(135deg,_#0f172a,_#111827_50%,_#0b1220)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-10 h-64 w-64 rounded-full bg-[#0b4f6c]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#f4a261]/25 blur-3xl" />
        <div className="absolute right-1/2 top-1/2 h-40 w-40 translate-x-1/2 rounded-3xl border border-white/50 bg-white/30 backdrop-blur" />
        <div className="absolute -top-24 right-10 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl dark:block hidden" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl dark:block hidden" />
        <div className="absolute right-1/2 top-1/2 h-40 w-40 translate-x-1/2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur dark:block hidden" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-10 py-10 sm:py-12 lg:flex-row lg:items-stretch">
        <div className="absolute right-6 top-6 z-10">
          <ThemeToggle />
        </div>
        <div className="flex w-full flex-col justify-center gap-6 lg:w-1/2">
          <div className="flex items-center gap-3">
            <BrandLogo size={52} className="shadow-lg shadow-primary/20" />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#5b7385] dark:text-slate-300">
                Viva Brightlife
              </p>
              <p className="text-sm font-semibold text-[#1e3a4f] dark:text-slate-100">
                Microfinance Co. Ltd
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0b4f6c] dark:text-teal-200">
            Viva Brightlife Microfinance
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[#123248] sm:text-4xl lg:text-5xl font-[family:Georgia,serif] dark:text-white">
            A calmer, clearer way to manage loans and collections.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-[#445566] sm:text-base dark:text-slate-300">
            Sign in to continue managing disbursements, repayments, member records,
            and reporting with confidence. Your data is protected and always in sync.
          </p>
          <div className="hidden max-w-xl grid-cols-2 gap-4 text-sm text-[#3a4f5f] sm:grid">
            <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              <p className="text-xs uppercase tracking-[0.2em] text-[#5c7386] dark:text-slate-300">Visibility</p>
              <p className="mt-2 font-semibold">Live repayment schedules</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              <p className="text-xs uppercase tracking-[0.2em] text-[#5c7386] dark:text-slate-300">Control</p>
              <p className="mt-2 font-semibold">Flexible loan tracking</p>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center lg:w-1/2">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
