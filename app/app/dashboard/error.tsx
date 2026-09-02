'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <div className="max-w-md">
        <h2 className="page-title text-3xl mb-3">Something went wrong</h2>
        <p className="text-sm text-muted mb-8">
          {error.message || 'Failed to load dashboard. Please try again.'}
        </p>
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
