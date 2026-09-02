import { formatPct, formatCurrency, cn } from '@/lib/utils';

export function Delta({
  pct,
  amount,
  className,
}: {
  pct?: number | null;
  amount?: number | null;
  className?: string;
}) {
  const value = pct ?? amount ?? 0;
  const positive = value > 0;
  const negative = value < 0;
  const label =
    pct != null
      ? formatPct(pct)
      : amount != null
        ? `${amount > 0 ? '+' : ''}${formatCurrency(amount)}`
        : '0.0%';

  return (
    <span
      className={cn(
        'pill',
        positive ? 'pill-green' : negative ? 'pill-red' : 'bg-surface-3 text-muted',
        className
      )}
    >
      <span aria-hidden>{positive ? '↑' : negative ? '↓' : '→'}</span>
      <span className="num">{label}</span>
    </span>
  );
}
