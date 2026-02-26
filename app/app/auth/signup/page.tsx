'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  async function handleGoogleSignup() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl mb-8"
            style={{ background: 'linear-gradient(135deg, #6e9bcf, #b0c4de)' }}
          >
            ⚡
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-white mb-4">JOIN PACKDRAFT</h1>
          <p className="text-base text-slate-500 tracking-wide">
            CREATE YOUR ACCOUNT · GET AUTO-ASSIGNED TO A LEAGUE
          </p>
        </div>

        <button
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-xl text-base font-bold tracking-wider text-white bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] transition-all mb-10"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          CONTINUE WITH GOOGLE
        </button>

        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-slate-600 tracking-widest">OR</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        <form onSubmit={handleSignup} className="space-y-8">
          <div>
            <label className="block text-xs text-slate-500 tracking-widest mb-3">
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="TrainerRed"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-base text-slate-200 placeholder:text-slate-600 outline-none transition-colors font-mono"
              onFocus={(e) => (e.target.style.borderColor = 'rgba(110,155,207,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 tracking-widest mb-3">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="trainer@pokemon.com"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-base text-slate-200 placeholder:text-slate-600 outline-none transition-colors font-mono"
              onFocus={(e) => (e.target.style.borderColor = 'rgba(110,155,207,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 tracking-widest mb-3">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-base text-slate-200 placeholder:text-slate-600 outline-none transition-colors font-mono"
              onFocus={(e) => (e.target.style.borderColor = 'rgba(110,155,207,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-5 py-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-xl text-base font-bold tracking-widest text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            style={{
              background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
              border: '2px solid rgba(110,155,207,0.4)',
              boxShadow: '0 0 24px rgba(110,155,207,0.18)',
            }}
          >
            {loading ? 'CREATING ACCOUNT...' : 'SIGN UP & ENTER DRAFT'}
          </button>
        </form>

        <p className="text-center text-base text-slate-600 mt-12">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-accent-light hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
