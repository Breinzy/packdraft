import Link from 'next/link';

export function SectionHeader({
  title,
  href,
  actionLabel = 'View all',
}: {
  title: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="section-title">{title}</h2>
      {href ? (
        <Link href={href} className="link-quiet inline-flex min-h-11 items-center">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
