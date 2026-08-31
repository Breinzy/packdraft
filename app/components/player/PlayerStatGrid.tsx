import { formatCurrency, formatReturn } from '@/lib/utils';
import type { PlayerHistory } from '@/lib/player/history';

export default function PlayerStatGrid({ history }: { history: PlayerHistory }) {
  const stats = [
    { label: 'PLAYED', value: String(history.played) },
    { label: 'WINS', value: String(history.wins) },
    { label: 'PODIUMS', value: String(history.podiums) },
    {
      label: 'AVG RETURN',
      value: history.played ? formatReturn(history.averageReturn) : '—',
    },
    {
      label: 'BEST',
      value: history.bestReturn == null ? '—' : formatReturn(history.bestReturn),
    },
    {
      label: 'WORST',
      value: history.worstReturn == null ? '—' : formatReturn(history.worstReturn),
    },
  ];

  if (history.totalTrades != null) {
    stats.push({ label: 'TRADES', value: String(history.totalTrades) });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
          <div className="text-[10px] text-slate-600 tracking-widest mb-1">{stat.label}</div>
          <div className="text-base md:text-lg font-bold text-white">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

export function TradeHighlights({ history }: { history: PlayerHistory }) {
  if (history.totalTrades == null) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
        <div className="text-[10px] text-slate-600 tracking-widest mb-2">BEST TRADE</div>
        {history.bestTrade ? (
          <>
            <div className="text-sm text-white truncate">{history.bestTrade.assetName}</div>
            <div className="text-sm text-green mt-1">{formatCurrency(history.bestTrade.pnl)}</div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No realized sells yet.</p>
        )}
      </div>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
        <div className="text-[10px] text-slate-600 tracking-widest mb-2">WORST TRADE</div>
        {history.worstTrade ? (
          <>
            <div className="text-sm text-white truncate">{history.worstTrade.assetName}</div>
            <div className={`text-sm mt-1 ${history.worstTrade.pnl >= 0 ? 'text-green' : 'text-red'}`}>
              {formatCurrency(history.worstTrade.pnl)}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No realized sells yet.</p>
        )}
      </div>
    </div>
  );
}
