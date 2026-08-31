import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold tracking-widest text-white mb-3">NOT FOUND</h1>
        <p className="text-sm text-slate-500 tracking-wider mb-8">
          That page is not part of Packdraft yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-3 min-h-11 rounded-xl text-sm font-bold tracking-widest text-white"
          style={{
            background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
            border: '2px solid rgba(110,155,207,0.3)',
          }}
        >
          HOME
        </Link>
      </div>
    </div>
  );
}
