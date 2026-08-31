import { describe, expect, it } from 'vitest';
import { buildPlayerHistory, replayRealizedTrades, type HistoryResult, type HistoryTrade } from './history';

const r = (partial: Partial<HistoryResult> & Pick<HistoryResult, 'tournamentId' | 'rank' | 'returnPct'>): HistoryResult => ({
  tournamentName: partial.tournamentName ?? partial.tournamentId,
  finalValue: partial.finalValue ?? 10000,
  startingCash: partial.startingCash ?? 10000,
  lockedAt: partial.lockedAt ?? '2026-08-01T00:00:00.000Z',
  ...partial,
});

describe('buildPlayerHistory', () => {
  it('counts played, wins, podiums, and return range', () => {
    const history = buildPlayerHistory(
      [
        r({ tournamentId: 'a', rank: 1, returnPct: 12, lockedAt: '2026-08-10T00:00:00.000Z' }),
        r({ tournamentId: 'b', rank: 3, returnPct: -4, lockedAt: '2026-08-01T00:00:00.000Z' }),
        r({ tournamentId: 'c', rank: 8, returnPct: 2, lockedAt: '2026-08-20T00:00:00.000Z' }),
      ],
      null
    );
    expect(history.played).toBe(3);
    expect(history.wins).toBe(1);
    expect(history.podiums).toBe(2);
    expect(history.bestReturn).toBe(12);
    expect(history.worstReturn).toBe(-4);
    expect(history.averageReturn).toBe(3.33);
    expect(history.results[0]?.tournamentId).toBe('c');
    expect(history.totalTrades).toBeNull();
    expect(history.achievements.find((a) => a.id === 'win')?.earned).toBe(true);
    expect(history.achievements.find((a) => a.id === 'trader')?.earned).toBe(false);
  });

  it('is empty for a player with no settled tournaments', () => {
    const history = buildPlayerHistory([], null);
    expect(history.played).toBe(0);
    expect(history.bestReturn).toBeNull();
    expect(history.achievements.every((a) => !a.earned)).toBe(true);
  });
});

describe('replayRealizedTrades', () => {
  it('computes sell P&L from average cost inside one book', () => {
    const trades: HistoryTrade[] = [
      {
        id: '1',
        portfolioId: 'p1',
        assetId: 'box',
        assetName: 'Booster Box',
        side: 'buy',
        quantity: 2,
        executionPrice: 100,
        totalValue: 200,
        executedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: '2',
        portfolioId: 'p1',
        assetId: 'box',
        assetName: 'Booster Box',
        side: 'sell',
        quantity: 1,
        executionPrice: 130,
        totalValue: 130,
        executedAt: '2026-08-01T11:00:00.000Z',
      },
    ];
    expect(replayRealizedTrades(trades)).toEqual([
      {
        id: '2',
        assetName: 'Booster Box',
        quantity: 1,
        executionPrice: 130,
        pnl: 30,
        executedAt: '2026-08-01T11:00:00.000Z',
      },
    ]);
  });

  it('does not mix average cost across tournament books', () => {
    const trades: HistoryTrade[] = [
      {
        id: '1',
        portfolioId: 'p1',
        assetId: 'box',
        assetName: 'Box',
        side: 'buy',
        quantity: 1,
        executionPrice: 100,
        totalValue: 100,
        executedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: '2',
        portfolioId: 'p2',
        assetId: 'box',
        assetName: 'Box',
        side: 'buy',
        quantity: 1,
        executionPrice: 200,
        totalValue: 200,
        executedAt: '2026-08-02T10:00:00.000Z',
      },
      {
        id: '3',
        portfolioId: 'p2',
        assetId: 'box',
        assetName: 'Box',
        side: 'sell',
        quantity: 1,
        executionPrice: 210,
        totalValue: 210,
        executedAt: '2026-08-02T11:00:00.000Z',
      },
    ];
    const realized = replayRealizedTrades(trades);
    expect(realized).toHaveLength(1);
    expect(realized[0]?.pnl).toBe(10);
  });
});
