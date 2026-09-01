import { formatCurrency, formatTimestamp } from '@/lib/utils';
import type { TransactionRow } from '@/lib/tournament/queries';

export default function TradeHistory({ trades }: { trades: TransactionRow[] }) {
  if (trades.length === 0) {
    return <p className="text-sm text-muted">No trades yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {trades.map((tx) => (
        <li
          key={tx.id}
          className="panel px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className={`text-xs font-semibold ${tx.side === 'buy' ? 'text-green' : 'text-red'}`}>
              {tx.side === 'buy' ? 'Buy' : 'Sell'}
            </span>
            <span className="num text-sm text-foreground">{formatCurrency(tx.total_value)}</span>
          </div>
          <div className="text-sm text-muted truncate mt-1">{tx.asset_name ?? 'Asset'}</div>
          <div className="text-[11px] text-faint mt-1">
            {tx.quantity} @ {formatCurrency(tx.execution_price)} ·{' '}
            {formatTimestamp(tx.executed_at)}
          </div>
        </li>
      ))}
    </ul>
  );
}
