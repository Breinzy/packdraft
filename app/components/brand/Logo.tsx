import Link from 'next/link';

export function Logo({
  href = '/',
  compact = false,
}: {
  href?: string | null;
  compact?: boolean;
}) {
  const mark = (
    <span className="inline-flex items-center gap-2.5 min-h-11">
      <span className="logo-mark" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 16.5 12 20l7-3.5v-9L12 4 5 7.5z" />
          <path d="M5 11.5 12 15l7-3.5" />
          <path d="M5 7.5 12 11l7-3.5" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[1.05rem] font-semibold text-foreground">Packdraft</span>
        {compact ? (
          <span className="mt-0.5 block text-[11px] font-medium tracking-[0.01em] text-muted">
            Portfolio Arena
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex items-center text-foreground">
      {mark}
    </Link>
  );
}

export default Logo;
