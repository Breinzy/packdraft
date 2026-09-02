import { Icon } from '@/components/icons';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { TransactionRow } from '@/lib/tournament/queries';

export default function TradeHistory({ trades }: { trades: TransactionRow[] }) {
  if (trades.length === 0) {
    return <p className="text-sm text-muted">No trades yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
      {trades.map((tx) => (
        <li key={tx.id} className="flex items-start gap-3.5 px-6 py-[1.125rem]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-3 text-muted">
            <Icon name={tx.side === 'buy' ? 'cart' : 'tag'} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-foreground">{tx.asset_name ?? 'Asset'}</span>
              <span className="num shrink-0 text-sm font-medium text-foreground">
                {formatCurrency(tx.total_value)}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
              <span className={tx.side === 'buy' ? 'text-green' : 'text-red'}>
                {tx.side === 'buy' ? 'Bought' : 'Sold'} {tx.quantity}
              </span>
              <span>@ {formatCurrency(tx.execution_price)}</span>
              <span className="text-faint">{formatRelativeTime(tx.executed_at)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
