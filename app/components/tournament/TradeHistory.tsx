import { formatCurrency } from '@/lib/utils';
import type { TransactionRow } from '@/lib/tournament/queries';

export default function TradeHistory({ trades }: { trades: TransactionRow[] }) {
  if (trades.length === 0) {
    return <p className="text-sm text-slate-500 tracking-wider">No trades yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {trades.map((tx) => (
        <li
          key={tx.id}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className={`text-xs font-bold tracking-widest ${tx.side === 'buy' ? 'text-green' : 'text-red'}`}>
              {tx.side.toUpperCase()}
            </span>
            <span className="text-sm text-white">{formatCurrency(tx.total_value)}</span>
          </div>
          <div className="text-sm text-slate-300 truncate mt-1">{tx.asset_name ?? 'Asset'}</div>
          <div className="text-[11px] text-slate-600 mt-1 tracking-wider">
            {tx.quantity} @ {formatCurrency(tx.execution_price)} ·{' '}
            {new Date(tx.executed_at).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
