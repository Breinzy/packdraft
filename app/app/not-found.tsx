import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-16">
      <div className="max-w-md">
        <h1 className="page-title text-2xl mb-3">Not found</h1>
        <p className="text-sm text-muted mb-8">That page is not part of Packdraft yet.</p>
        <Link href="/" className="btn btn-primary">
          Home
        </Link>
      </div>
    </div>
  );
}
