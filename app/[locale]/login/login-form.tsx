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
      await fetch('/api/profile/bootstrap', {method: 'POST'});
      router.replace('/dashboard');
      router.refresh();
      return;
    }

    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6">
      <div>
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage microfinance operations.</p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm">Email</span>
        <input
          type="email"
          required
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">Password</span>
        <input
          type="password"
          required
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Login'}
      </button>
    </form>
  );
}
