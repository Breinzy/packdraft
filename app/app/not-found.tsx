import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <div className="max-w-md">
        <h1 className="page-title text-3xl mb-3">Not found</h1>
        <p className="text-sm text-muted mb-8">That page is not part of Packdraft yet.</p>
        <Link href="/" className="btn btn-primary">
          Home
        </Link>
      </div>
    </div>
  );
}
