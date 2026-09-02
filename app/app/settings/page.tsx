'use client';

import { useState, useEffect } from 'react';
import { createClient, tryCreateBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
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
        .select('display_name')
        .eq('id', user.id)
        .single();

      setDisplayName(profile?.display_name ?? '');
      setChecking(false);
    }
    init(client);
  }, [router]);

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
    } else {
      setSaved(true);
    }
    setLoading(false);
  }

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell nav="settings">
      <main className="w-full max-w-lg mx-auto py-8 md:py-12">
        <div className="mb-10">
          <h1 className="page-title text-3xl mb-2">Settings</h1>
          <p className="text-sm text-muted">Manage how you appear in tournaments.</p>
        </div>

        <div className="panel p-6 md:p-8">
          <h2 className="kicker mb-6">Display name</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="kicker mb-2 block">Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
                maxLength={24}
                placeholder="TrainerRed"
                className="field"
              />
              <div className="text-xs text-faint mt-2">
                {displayName.length}/24 characters
              </div>
            </div>

            {error && (
              <div className="text-sm text-red border border-red/25 bg-red/10 rounded-md px-4 py-3">
                {error}
              </div>
            )}

            {saved && (
              <div className="text-sm text-green border border-green/25 bg-green/10 rounded-md px-4 py-3">
                Saved
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
