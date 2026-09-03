export function ErrorState({
  title = 'Something went wrong',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="panel border-[color-mix(in_srgb,var(--color-red)_28%,var(--color-border))]">
      <p className="text-sm font-semibold text-red">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
    </div>
  );
}
