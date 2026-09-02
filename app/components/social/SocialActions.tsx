'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SocialActions({
  userId,
  following,
  friends,
  outgoing,
  incomingId,
}: {
  userId: string;
  following: boolean;
  friends: boolean;
  outgoing: boolean;
  incomingId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');

  async function run(action: string, extra?: Record<string, unknown>) {
    setError('');
    setLoading(action);
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, ...extra }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=/players/${userId}`);
          return;
        }
        setError(data.error ?? 'Could not update');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        className="btn btn-ghost min-h-11"
        disabled={Boolean(loading)}
        onClick={() => run(following ? 'unfollow' : 'follow')}
      >
        {following ? 'Unfollow' : 'Follow'}
      </button>
      {friends ? (
        <span className="min-h-11 inline-flex items-center text-sm text-muted">Friends</span>
      ) : incomingId ? (
        <>
          <button
            type="button"
            className="btn btn-primary min-h-11"
            disabled={Boolean(loading)}
            onClick={() => run('friend-respond', { friendshipId: incomingId, accept: true })}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn btn-ghost min-h-11"
            disabled={Boolean(loading)}
            onClick={() => run('friend-respond', { friendshipId: incomingId, accept: false })}
          >
            Decline
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary min-h-11"
          disabled={Boolean(loading) || outgoing}
          onClick={() => run('friend-request')}
        >
          {outgoing ? 'Request sent' : 'Add friend'}
        </button>
      )}
      {error ? <p className="text-sm text-red w-full">{error}</p> : null}
    </div>
  );
}
