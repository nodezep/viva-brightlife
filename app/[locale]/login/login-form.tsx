'use client';

import {useState} from 'react';
import {useRouter} from '@/lib/navigation';
import {createClient} from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const {error: signInError, data} = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const bootstrap = await fetch('/api/profile/bootstrap', {method: 'POST'});
      if (!bootstrap.ok) {
        await supabase.auth.signOut();
        setError('Your account has been disabled. Please contact the admin.');
        setLoading(false);
        return;
      }
      router.replace('/dashboard');
      router.refresh();
      return;
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-2xl backdrop-blur sm:max-w-md sm:space-y-5 sm:p-7 dark:border-white/10 dark:bg-slate-950/60"
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5b7385] dark:text-slate-300">Admin Access</p>
        <h1 className="text-xl font-semibold text-[#123248] font-[family:Georgia,serif] sm:text-2xl dark:text-white">
          Sign in to your workspace
        </h1>
        <p className="text-sm text-[#5d6f7f] dark:text-slate-300">
          Enter your credentials to manage loans, groups, and repayment schedules.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[#324a5a] dark:text-slate-200">Email</span>
        <input
          type="email"
          required
          className="w-full rounded-xl border border-[#d8e2ea] bg-white/70 px-4 py-3 text-sm text-[#1d2f3b] shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:ring-primary/30"
          placeholder="you@viva.co.tz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[#324a5a] dark:text-slate-200">Password</span>
        <input
          type="password"
          required
          className="w-full rounded-xl border border-[#d8e2ea] bg-white/70 px-4 py-3 text-sm text-[#1d2f3b] shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:ring-primary/30"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-primary/30 disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Login'}
      </button>

      <p className="text-center text-xs text-[#6a7d8d] dark:text-slate-400">
        Need help? Contact your system administrator.
      </p>
    </form>
  );
}
