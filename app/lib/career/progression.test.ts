import { describe, expect, it } from 'vitest';
import type { HistoryTrade } from '@/lib/player/history';
import {
  buildCareerProgression,
  careerLevelFromPeak,
  investorArchetype,
  tradeStreakUtc,
} from './progression';

const buy = (partial: Partial<HistoryTrade> & Pick<HistoryTrade, 'id' | 'executedAt'>): HistoryTrade => ({
  portfolioId: 'career',
  assetId: 'box',
  assetName: 'Box',
  side: 'buy',
  quantity: 1,
  executionPrice: 100,
  totalValue: 100,
  ...partial,
});

describe('careerLevelFromPeak', () => {
  it('starts as Rookie at $1,000 and climbs the milestone ladder', () => {
    expect(careerLevelFromPeak(1000)).toMatchObject({ level: 1, name: 'Rookie', nextAt: 2000 });
    expect(careerLevelFromPeak(2000)).toMatchObject({ level: 2, name: 'Collector', nextAt: 5000 });
    expect(careerLevelFromPeak(1_000_000)).toMatchObject({
      level: 7,
      name: 'Legend',
      nextAt: null,
    });
  });
});

describe('investorArchetype', () => {
  it('labels a cash-heavy book', () => {
    const result = investorArchetype({
      cash: 900,
      portfolioValue: 1000,
      holdings: [{ assetType: 'sealed', quantity: 1, markPrice: 100 }],
      tradeCount: 1,
    });
    expect(result.id).toBe('cash-heavy');
  });

  it('labels a sealed-majority book', () => {
    const result = investorArchetype({
      cash: 100,
      portfolioValue: 1100,
      holdings: [
        { assetType: 'sealed', quantity: 2, markPrice: 400 },
        { assetType: 'single', quantity: 1, markPrice: 200 },
      ],
      tradeCount: 3,
    });
    expect(result.id).toBe('sealed');
  });
});

describe('tradeStreakUtc', () => {
  it('counts consecutive UTC days ending today', () => {
    const now = new Date('2026-09-02T18:00:00.000Z');
    expect(
      tradeStreakUtc(
        ['2026-08-31T10:00:00.000Z', '2026-09-01T10:00:00.000Z', '2026-09-02T09:00:00.000Z'],
        now
      )
    ).toBe(3);
  });

  it('keeps yesterday alive if there is no fill yet today', () => {
    const now = new Date('2026-09-02T18:00:00.000Z');
    expect(tradeStreakUtc(['2026-09-01T10:00:00.000Z'], now)).toBe(1);
  });

  it('breaks when the last fill is older than yesterday', () => {
    const now = new Date('2026-09-02T18:00:00.000Z');
    expect(tradeStreakUtc(['2026-08-30T10:00:00.000Z'], now)).toBe(0);
  });
});

describe('buildCareerProgression', () => {
  it('unlocks first-buy and keeps tournament-style realized P&L isolated to this book', () => {
    const trades: HistoryTrade[] = [
      buy({ id: '1', executedAt: '2026-09-01T10:00:00.000Z' }),
      {
        id: '2',
        portfolioId: 'career',
        assetId: 'box',
        assetName: 'Box',
        side: 'sell',
        quantity: 1,
        executionPrice: 130,
        totalValue: 130,
        executedAt: '2026-09-01T12:00:00.000Z',
      },
    ];
    const prog = buildCareerProgression({
      cash: 1030,
      currentValue: 1030,
      peakValue: 1030,
      holdings: [],
      trades,
      now: new Date('2026-09-01T18:00:00.000Z'),
    });
    expect(prog.level.level).toBe(1);
    expect(prog.stats.realizedPnl).toBe(30);
    expect(prog.achievements.find((a) => a.id === 'first-buy')?.earned).toBe(true);
    expect(prog.achievements.find((a) => a.id === 'first-sell')?.earned).toBe(true);
    expect(prog.achievements.find((a) => a.id === 'profitable-sell')?.earned).toBe(true);
    expect(prog.milestones.every((m) => !m.earned)).toBe(true);
  });
});
