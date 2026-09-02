import { formatCurrency, formatReturn } from '@/lib/utils';
import type { PlayerHistory } from '@/lib/player/history';

export default function PlayerStatGrid({ history }: { history: PlayerHistory }) {
  const stats = [
    { label: 'Played', value: String(history.played) },
    { label: 'Wins', value: String(history.wins) },
    { label: 'Podiums', value: String(history.podiums) },
    {
      label: 'Avg return',
      value: history.played ? formatReturn(history.averageReturn) : '—',
    },
    {
      label: 'Best',
      value: history.bestReturn == null ? '—' : formatReturn(history.bestReturn),
    },
    {
      label: 'Worst',
      value: history.worstReturn == null ? '—' : formatReturn(history.worstReturn),
    },
  ];

  if (history.totalTrades != null) {
    stats.push({ label: 'Trades', value: String(history.totalTrades) });
  }

  return (
    <div className="card-grid grid-cols-2 md:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="panel stat-tile">
          <div className="kicker">{stat.label}</div>
          <div className="num text-base md:text-lg font-medium text-foreground">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

export function TradeHighlights({ history }: { history: PlayerHistory }) {
  if (history.totalTrades == null) return null;
  return (
    <div className="card-grid grid-cols-1 md:grid-cols-2">
      <div className="panel">
        <div className="kicker mb-2">Best trade</div>
        {history.bestTrade ? (
          <>
            <div className="text-sm text-foreground truncate">{history.bestTrade.assetName}</div>
            <div className="text-sm text-green mt-1">{formatCurrency(history.bestTrade.pnl)}</div>
          </>
        ) : (
          <p className="text-sm text-muted">No realized sells yet.</p>
        )}
      </div>
      <div className="panel">
        <div className="kicker mb-2">Worst trade</div>
        {history.worstTrade ? (
          <>
            <div className="text-sm text-foreground truncate">{history.worstTrade.assetName}</div>
            <div className={`text-sm mt-1 ${history.worstTrade.pnl >= 0 ? 'text-green' : 'text-red'}`}>
              {formatCurrency(history.worstTrade.pnl)}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">No realized sells yet.</p>
        )}
      </div>
    </div>
  );
}
