'use client';

import AppShell from '@/components/layout/AppShell';

export default function OverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <div className="panel max-w-md p-6">
        <h2 className="page-title mb-3 text-2xl">Something went wrong</h2>
        <p className="mb-8 text-sm text-muted">
          {error.message || "Failed to load overview. Please try again."}
        </p>
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
    </AppShell>
  );
}
