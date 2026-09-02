'use client';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-16">
      <div className="max-w-md">
        <h2 className="page-title text-2xl mb-3">Something went wrong</h2>
        <p className="text-sm text-muted mb-8">{error.message || 'Please try again.'}</p>
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
