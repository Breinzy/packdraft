'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function join() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tournaments/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=/tournaments/${tournamentId}`);
          return;
        }
        setError(data.error ?? 'Could not join');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={join} disabled={loading} className="btn btn-primary min-h-12 px-8 w-full md:w-auto">
        {loading ? 'Joining…' : 'Join tournament'}
      </button>
      {error ? <p className="text-sm text-red">{error}</p> : null}
    </div>
  );
}
