export function PageHeader({
  title,
  subtitle,
  action,
  extra,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const trailing = action ?? extra;
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-pretty text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
