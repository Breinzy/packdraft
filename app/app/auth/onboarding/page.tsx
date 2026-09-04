'use client';

import { useState, useEffect } from 'react';
import { createClient, tryCreateBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/layout/AuthShell';

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const client = tryCreateBrowserClient();
    if (!client) {
      router.push('/auth/login');
      return;
    }

    async function init(db: NonNullable<typeof client>) {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await db
        .from('profiles')
        .select('display_name_set')
        .eq('id', user.id)
        .single();

      if (profile?.display_name_set) {
        router.push('/');
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
    init(client);
  }, [router]);

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

    const supabase = createClient();
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

    router.push('/');
  }

  async function handleSkip() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    await supabase
      .from('profiles')
      .update({ display_name_set: true })
      .eq('id', user.id);

    router.push('/');
  }

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <AuthShell title="Choose your name" subtitle="This is how you appear on leaderboards.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="kicker mb-2 block">Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={24}
            placeholder="TrainerRed"
            autoFocus
            className="field"
          />
          <div className="text-xs text-faint mt-2">{displayName.length}/24</div>
        </label>
        {error ? (
          <div className="text-sm text-red border border-red/25 bg-red/10 rounded-md px-4 py-3">{error}</div>
        ) : null}
        <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-12">
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </form>
      <button
        onClick={handleSkip}
        disabled={loading}
        className="w-full text-center text-sm text-faint hover:text-muted mt-5 disabled:opacity-50"
      >
        Skip for now
      </button>
    </AuthShell>
  );
}
