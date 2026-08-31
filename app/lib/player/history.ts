import { applyBuy, applySell, emptyBook, type EngineBook } from '@/lib/portfolio/engine';
import { roundMoney } from '@/lib/money';

export interface HistoryResult {
  tournamentId: string;
  tournamentName: string;
  rank: number;
  returnPct: number;
  finalValue: number;
  startingCash: number;
  lockedAt: string;
}

export interface HistoryTrade {
  id: string;
  portfolioId: string;
  assetId: string;
  assetName: string;
  side: 'buy' | 'sell';
  quantity: number;
  executionPrice: number;
  totalValue: number;
  executedAt: string;
}

export interface RealizedTrade {
  id: string;
  assetName: string;
  quantity: number;
  executionPrice: number;
  pnl: number;
  executedAt: string;
}

export interface PlayerHistory {
  played: number;
  wins: number;
  podiums: number;
  averageReturn: number;
  bestReturn: number | null;
  worstReturn: number | null;
  results: HistoryResult[];
  totalTrades: number | null;
  bestTrade: RealizedTrade | null;
  worstTrade: RealizedTrade | null;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  label: string;
  earned: boolean;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return roundMoney(values.reduce((sum, n) => sum + n, 0) / values.length);
}

export function summarizeResults(results: HistoryResult[]): Omit<
  PlayerHistory,
  'totalTrades' | 'bestTrade' | 'worstTrade' | 'achievements' | 'results'
> & { results: HistoryResult[] } {
  const ordered = [...results].sort((a, b) => (a.lockedAt < b.lockedAt ? 1 : -1));
  const returns = ordered.map((r) => r.returnPct);
  return {
    played: ordered.length,
    wins: ordered.filter((r) => r.rank === 1).length,
    podiums: ordered.filter((r) => r.rank <= 3).length,
    averageReturn: average(returns),
    bestReturn: returns.length ? Math.max(...returns) : null,
    worstReturn: returns.length ? Math.min(...returns) : null,
    results: ordered,
  };
}

export function replayRealizedTrades(trades: HistoryTrade[]): RealizedTrade[] {
  const byBook = new Map<string, HistoryTrade[]>();
  for (const trade of trades) {
    const list = byBook.get(trade.portfolioId) ?? [];
    list.push(trade);
    byBook.set(trade.portfolioId, list);
  }

  const realized: RealizedTrade[] = [];
  for (const [portfolioId, list] of byBook) {
    list.sort((a, b) => {
      if (a.executedAt !== b.executedAt) return a.executedAt < b.executedAt ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    let book: EngineBook = emptyBook({
      id: portfolioId,
      userId: 'history',
      tournamentId: 'history',
      startingCash: 1_000_000_000,
      joinedAt: list[0]?.executedAt ?? new Date(0).toISOString(),
    });

    for (const trade of list) {
      const fill = {
        assetId: trade.assetId,
        quantity: trade.quantity,
        price: trade.executionPrice,
      };
      if (trade.side === 'buy') {
        book = applyBuy(book, fill);
        continue;
      }
      const held = book.positions.find((p) => p.assetId === trade.assetId);
      if (!held) continue;
      const pnl = roundMoney((trade.executionPrice - held.averageCost) * trade.quantity);
      book = applySell(book, fill);
      realized.push({
        id: trade.id,
        assetName: trade.assetName,
        quantity: trade.quantity,
        executionPrice: trade.executionPrice,
        pnl,
        executedAt: trade.executedAt,
      });
    }
  }

  return realized;
}

export function summarizeTrades(trades: HistoryTrade[]): {
  totalTrades: number;
  bestTrade: RealizedTrade | null;
  worstTrade: RealizedTrade | null;
} {
  const realized = replayRealizedTrades(trades);
  let best: RealizedTrade | null = null;
  let worst: RealizedTrade | null = null;
  for (const trade of realized) {
    if (!best || trade.pnl > best.pnl) best = trade;
    if (!worst || trade.pnl < worst.pnl) worst = trade;
  }
  return {
    totalTrades: trades.length,
    bestTrade: best,
    worstTrade: worst,
  };
}

export function deriveAchievements(input: {
  played: number;
  wins: number;
  podiums: number;
  bestReturn: number | null;
  totalTrades: number | null;
}): Achievement[] {
  return [
    { id: 'played', label: 'Played a tournament', earned: input.played >= 1 },
    { id: 'win', label: 'Won a tournament', earned: input.wins >= 1 },
    { id: 'podium', label: 'Finished top 3', earned: input.podiums >= 1 },
    {
      id: 'double-digit',
      label: 'Posted a 10%+ return',
      earned: (input.bestReturn ?? 0) >= 10,
    },
    {
      id: 'trader',
      label: 'Made 10 trades',
      earned: (input.totalTrades ?? 0) >= 10,
    },
  ];
}

export function buildPlayerHistory(
  results: HistoryResult[],
  trades: HistoryTrade[] | null
): PlayerHistory {
  const summary = summarizeResults(results);
  const tradeSummary = trades ? summarizeTrades(trades) : { totalTrades: null, bestTrade: null, worstTrade: null };
  return {
    ...summary,
    ...tradeSummary,
    achievements: deriveAchievements({
      played: summary.played,
      wins: summary.wins,
      podiums: summary.podiums,
      bestReturn: summary.bestReturn,
      totalTrades: tradeSummary.totalTrades,
    }),
  };
}
