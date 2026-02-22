'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/draft');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-yellow-400 text-xl mb-4">
            ⚡
          </div>
          <h1 className="text-xl font-bold tracking-widest text-white">PACKDRAFT</h1>
          <p className="text-xs text-slate-500 mt-2 tracking-wide">
            SIGN IN TO YOUR ACCOUNT
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-500 tracking-widest mb-1.5">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="trainer@pokemon.com"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 tracking-widest mb-1.5">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors font-mono"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md bg-gradient-to-r from-purple-600 to-purple-700 border border-purple-500/50 text-white text-xs font-bold tracking-widest hover:from-purple-500 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(124,58,237,0.3)]"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-purple-400 hover:text-purple-300 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
