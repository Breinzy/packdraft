'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-widest text-white mb-4">CHECK YOUR EMAIL</h1>
          <p className="text-base text-slate-500 tracking-wide mb-8">
            If an account exists for {email}, we sent a reset link.
          </p>
          <Link href="/auth/login" className="text-accent-light hover:text-white transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-widest text-white mb-4">RESET PASSWORD</h1>
          <p className="text-base text-slate-500 tracking-wide">WE&apos;LL EMAIL YOU A RESET LINK</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs text-slate-500 tracking-widest mb-3">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="trainer@pokemon.com"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-base text-slate-200 placeholder:text-slate-600 outline-none font-mono"
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
            className="w-full py-5 min-h-14 rounded-xl text-base font-bold tracking-widest text-white disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
              border: '2px solid rgba(110,155,207,0.4)',
            }}
          >
            {loading ? 'SENDING...' : 'SEND RESET LINK'}
          </button>
        </form>

        <p className="text-center text-base text-slate-600 mt-12">
          <Link href="/auth/login" className="text-accent-light hover:text-white transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
