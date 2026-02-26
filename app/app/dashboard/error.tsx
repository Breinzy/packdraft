'use client';

export default function DashboardError({
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
          SOMETHING WENT WRONG
        </h2>
        <p className="text-sm text-slate-500 tracking-wider mb-8">
          {error.message || 'Failed to load dashboard. Please try again.'}
        </p>
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
      </div>
    </div>
  );
}
