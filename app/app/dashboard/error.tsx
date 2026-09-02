'use client';

import AppShell from '@/components/layout/AppShell';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell nav="dashboard">
      <main className="page py-10">
        <div className="panel max-w-md p-6">
          <h2 className="page-title text-2xl mb-3">Something went wrong</h2>
          <p className="text-sm text-muted mb-8">
            {error.message || 'Failed to load dashboard. Please try again.'}
          </p>
          <button onClick={reset} className="btn btn-primary">
            Try again
          </button>
        </div>
      </main>
    </AppShell>
  );
}
