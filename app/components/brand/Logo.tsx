import Link from 'next/link';

export default function Logo({
  href = '/',
  compact = false,
}: {
  href?: string | null;
  compact?: boolean;
}) {
  const mark = (
    <span className="inline-flex items-center gap-2.5 min-h-11">
      <span className="logo-mark" aria-hidden>
        P
      </span>
      {compact ? null : (
        <span className="font-display italic text-[1.2rem] tracking-tight text-foreground leading-none">
          Packdraft
        </span>
      )}
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex items-center text-foreground">
      {mark}
    </Link>
  );
}
