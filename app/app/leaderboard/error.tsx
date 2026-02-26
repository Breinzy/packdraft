'use client';

import Link from 'next/link';

export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-6">&#x26A0;&#xFE0F;</div>
        <h2 className="text-xl font-bold tracking-widest text-white mb-3">
          LEADERBOARD UNAVAILABLE
        </h2>
        <p className="text-sm text-slate-500 tracking-wider mb-8">
          {error.message || 'Failed to load the leaderboard. Please try again.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 rounded-xl text-sm font-bold tracking-widest text-white"
            style={{
              background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
              border: '2px solid rgba(110,155,207,0.3)',
            }}
          >
            TRY AGAIN
          </button>
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-xl text-sm font-bold tracking-widest text-slate-400 border border-white/[0.08] hover:text-white hover:border-white/20"
          >
            DASHBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}
