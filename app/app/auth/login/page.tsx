'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '@/components/layout/AuthShell';

function LoginForm() {
  const searchParams = useSearchParams();
  const initialError =
    searchParams.get('error') === 'auth_failed'
      ? 'Authentication failed. Please try again.'
      : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const nextParam = searchParams.get('next');
    const next =
      nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
        ? nextParam
        : '/dashboard';
    router.push(next);
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <AuthShell title="Sign in" subtitle="Same book, same prices — pick up where you left off.">
      <button onClick={handleGoogleLogin} className="btn btn-ghost w-full min-h-12 gap-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-border" />
        <span className="kicker">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <label className="block">
          <span className="kicker mb-2 block">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@email.com"
            className="field"
          />
        </label>
        <label className="block">
          <span className="kicker mb-2 block">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="field"
          />
        </label>
        {error ? (
          <div className="text-sm text-red border border-red/25 bg-red/10 rounded-md px-4 py-3">{error}</div>
        ) : null}
        <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-12">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-muted mt-6">
        <Link href="/auth/forgot" className="text-accent-light hover:text-foreground">
          Forgot password?
        </Link>
      </p>
      <p className="text-sm text-muted mt-4">
        No account?{' '}
        <Link href="/auth/signup" className="text-accent-light hover:text-foreground">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
