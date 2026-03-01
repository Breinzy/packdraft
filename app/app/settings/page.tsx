'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
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
        .select('display_name')
        .eq('id', user.id)
        .single();

      setDisplayName(profile?.display_name ?? '');
      setChecking(false);
    }
    init();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);

    const name = displayName.trim();
    if (!name) {
      setError('Display name cannot be empty.');
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
    } else {
      setSaved(true);
    }
    setLoading(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600 tracking-widest text-sm">LOADING...</div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-8 md:py-12 max-w-lg mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-widest text-white mb-1">SETTINGS</h1>
          <p className="text-sm text-slate-600 tracking-wider">Manage your account preferences</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 md:p-8">
          <h2 className="text-sm font-bold tracking-widest text-white mb-6">DISPLAY NAME</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-slate-500 tracking-widest mb-3">
                NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
                maxLength={24}
                placeholder="TrainerRed"
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

            {saved && (
              <div className="text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-5 py-4 tracking-wider">
                SAVED
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-sm font-bold tracking-widest text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
                border: '2px solid rgba(110,155,207,0.4)',
              }}
            >
              {loading ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
