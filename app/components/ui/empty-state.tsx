import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-start gap-3 p-6 py-10">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="max-w-lg text-sm leading-6 text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
