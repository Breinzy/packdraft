'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name_set')
        .eq('id', user.id)
        .single();

      if (profile?.display_name_set) {
        router.push('/dashboard');
        return;
      }

      const defaultName =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        '';
      setDisplayName(defaultName);
      setChecking(false);
    }
    init();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const name = displayName.trim();
    if (!name) {
      setError('Please enter a display name.');
      setLoading(false);
      return;
    }

    if (name.length < 2 || name.length > 24) {
      setError('Name must be between 2 and 24 characters.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: name, display_name_set: true })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  async function handleSkip() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    await supabase
      .from('profiles')
      .update({ display_name_set: true })
      .eq('id', user.id);

    router.push('/dashboard');
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600 tracking-widest text-sm">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl mb-8"
            style={{ background: 'linear-gradient(135deg, #6e9bcf, #b0c4de)' }}
          >
            ⚡
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-white mb-4">
            CHOOSE YOUR NAME
          </h1>
          <p className="text-base text-slate-500 tracking-wide">
            THIS IS HOW YOU&apos;LL APPEAR ON LEADERBOARDS AND IN LEAGUES
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs text-slate-500 tracking-widest mb-3">
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
              placeholder="TrainerRed"
              autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-base text-slate-200 placeholder:text-slate-600 outline-none transition-colors font-mono"
              onFocus={(e) => (e.target.style.borderColor = 'rgba(110,155,207,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <div className="text-xs text-slate-700 tracking-wider mt-2">
              {displayName.length}/24 characters
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-5 py-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-xl text-base font-bold tracking-widest text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
              border: '2px solid rgba(110,155,207,0.4)',
              boxShadow: '0 0 24px rgba(110,155,207,0.18)',
            }}
          >
            {loading ? 'SAVING...' : 'CONTINUE'}
          </button>
        </form>

        <button
          onClick={handleSkip}
          disabled={loading}
          className="w-full text-center text-sm text-slate-600 hover:text-slate-400 tracking-widest mt-6 transition-colors disabled:opacity-50"
        >
          SKIP FOR NOW
        </button>
      </div>
    </div>
  );
}
