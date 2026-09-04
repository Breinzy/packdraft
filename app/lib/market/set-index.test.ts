import { describe, expect, it } from 'vitest';
import { basketValue, buildSetIndex, indexChangePct, observationDayBaskets, sampledIndexHistory } from './set-index';

describe('basketValue', () => {
  it('sums only positive member prices so cards and sealed share one index', () => {
    expect(basketValue([10, 0, 2.5, -1])).toBe(12.5);
    expect(basketValue([])).toBe(0);
  });
});

describe('indexChangePct', () => {
  it('returns 0 when the prior basket is missing', () => {
    expect(indexChangePct(100, 0)).toBe(0);
  });

  it('measures overlapping basket move', () => {
    expect(indexChangePct(120, 100)).toBe(20);
  });
});

describe('observationDayBaskets', () => {
  it('lumps cards and sealed on shared observation days with LOCF', () => {
    const history = observationDayBaskets(
      [
        { assetId: 'card', price: 10, recordedAt: '2026-01-01T12:00:00.000Z' },
        { assetId: 'etb', price: 40, recordedAt: '2026-01-01T18:00:00.000Z' },
        { assetId: 'card', price: 12, recordedAt: '2026-01-10T12:00:00.000Z' },
      ],
      new Date('2026-01-10T20:00:00.000Z')
    );
    expect(history).toEqual([50, 52]);
  });

  it('does not invent calendar days between observations', () => {
    const history = observationDayBaskets(
      [{ assetId: 'a', price: 5, recordedAt: '2026-03-01T00:00:00.000Z' }],
      new Date('2026-03-01T00:00:00.000Z')
    );
    expect(history).toEqual([5]);
  });

  it('appends today using carried-forward member prices', () => {
    const history = observationDayBaskets(
      [{ assetId: 'a', price: 8, recordedAt: '2026-04-01T00:00:00.000Z' }],
      new Date('2026-04-03T15:00:00.000Z')
    );
    expect(history).toEqual([8, 8]);
  });
});

describe('buildSetIndex', () => {
  it('uses a two-point series when only now and 30d baskets exist', () => {
    const index = buildSetIndex({
      currentPrice: 200,
      price30d: 160,
      trackedCount: 40,
      sealedCount: 3,
      cardCount: 37,
      pricedCount: 35,
    });
    expect(index.price).toBe(200);
    expect(index.change30d).toBe(25);
    expect(index.history).toEqual([160, 200]);
    expect(index.sealedCount).toBe(3);
  });
});

describe('sampledIndexHistory', () => {
  it('keeps real as-of baskets and drops duplicate consecutive levels', () => {
    expect(sampledIndexHistory([100, 100, 110, null, 120])).toEqual([100, 110, 120]);
    expect(sampledIndexHistory([0, undefined, -1])).toEqual([]);
  });
});
