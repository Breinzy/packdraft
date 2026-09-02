'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinButton({
  tournamentId,
  inviteCode,
}: {
  tournamentId: string;
  inviteCode?: string | null;
}) {
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
        body: JSON.stringify({ tournamentId, inviteCode: inviteCode || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          const next = inviteCode
            ? `/tournaments/${tournamentId}?invite=${encodeURIComponent(inviteCode)}`
            : `/tournaments/${tournamentId}`;
          router.push(`/auth/login?next=${encodeURIComponent(next)}`);
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
