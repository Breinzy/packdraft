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
      <button
        type="button"
        onClick={join}
        disabled={loading}
        className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 min-h-14 rounded-2xl text-base font-bold tracking-widest text-white disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
          border: '2px solid rgba(110,155,207,0.4)',
        }}
      >
        {loading ? 'JOINING…' : 'JOIN TOURNAMENT'}
      </button>
      {error ? <p className="text-sm text-red">{error}</p> : null}
    </div>
  );
}
