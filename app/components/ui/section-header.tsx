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
    <div className="flex items-center justify-between gap-4">
      <h2 className="section-title">{title}</h2>
      {href ? (
        <Link href={href} className="link-quiet shrink-0 py-1">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
