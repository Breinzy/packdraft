import { describe, expect, it } from 'vitest';
import {
  computeSettlementQuote,
  percentileCont,
  qualifyingWindowSnapshots,
  type SettlementSnapshot,
} from './settlement-price';

const AS_OF = '2026-09-02T07:00:00.000Z';

function snap(
  id: string,
  price: number,
  recordedAt: string,
  volume: number | null = null
): SettlementSnapshot {
  return { id, price, recordedAt, volume };
}

describe('percentileCont', () => {
  it('matches Postgres percentile_cont linear interpolation', () => {
    expect(percentileCont([10, 20, 30, 40, 100], 0.25)).toBe(20);
    expect(percentileCont([10, 20, 30, 40, 100], 0.75)).toBe(40);
    expect(percentileCont([10, 20, 30, 40], 0.5)).toBe(25);
  });
});

describe('computeSettlementQuote', () => {
  it('uses the median after dropping an IQR outlier', () => {
    const quote = computeSettlementQuote(
      [
        snap('a', 10, '2026-09-01T08:00:00.000Z'),
        snap('b', 20, '2026-09-01T12:00:00.000Z'),
        snap('c', 30, '2026-09-01T16:00:00.000Z'),
        snap('d', 40, '2026-09-01T20:00:00.000Z'),
        snap('e', 100, '2026-09-02T06:00:00.000Z'),
      ],
      AS_OF
    );
    expect(quote).toEqual({
      price: 25,
      method: 'median',
      sampleSize: 4,
      snapshotId: null,
      recordedAt: AS_OF,
    });
  });

  it('means two qualifying prints', () => {
    const quote = computeSettlementQuote(
      [
        snap('a', 10, '2026-09-01T12:00:00.000Z'),
        snap('b', 20, '2026-09-02T06:00:00.000Z'),
      ],
      AS_OF
    );
    expect(quote?.method).toBe('mean');
    expect(quote?.price).toBe(15);
    expect(quote?.snapshotId).toBeNull();
  });

  it('uses a single in-window print as-is', () => {
    const quote = computeSettlementQuote(
      [snap('only', 42.499, '2026-09-02T01:00:00.000Z', 3)],
      AS_OF
    );
    expect(quote).toMatchObject({
      method: 'single',
      sampleSize: 1,
      snapshotId: 'only',
      price: 42.5,
    });
  });

  it('falls back to the latest print at or before as-of when the window is empty', () => {
    const quote = computeSettlementQuote(
      [
        snap('old', 88, '2026-08-30T00:00:00.000Z'),
        snap('too-new', 1, '2026-09-02T08:00:00.000Z'),
      ],
      AS_OF
    );
    expect(quote).toMatchObject({
      method: 'fallback',
      snapshotId: 'old',
      price: 88,
    });
  });

  it('does not use an arbitrary last sale when a window exists', () => {
    const quote = computeSettlementQuote(
      [
        snap('a', 10, '2026-09-01T10:00:00.000Z'),
        snap('b', 12, '2026-09-01T14:00:00.000Z'),
        snap('c', 14, '2026-09-01T18:00:00.000Z'),
        snap('last', 999, '2026-09-02T06:50:00.000Z'),
      ],
      AS_OF
    );
    expect(quote?.method).toBe('median');
    expect(quote?.price).not.toBe(999);
  });

  it('keeps zero-volume prints because 0 is the stored default for unknown volume', () => {
    const inWindow = qualifyingWindowSnapshots(
      [
        snap('zero', 50, '2026-09-02T01:00:00.000Z', 0),
        snap('unknown', 40, '2026-09-02T02:00:00.000Z', null),
        snap('ok', 45, '2026-09-02T03:00:00.000Z', 2),
        snap('outside', 99, '2026-09-01T06:00:00.000Z', 10),
      ],
      AS_OF
    );
    expect(inWindow.map((r) => r.id).sort()).toEqual(['ok', 'unknown', 'zero']);
  });

  it('includes every source in the window', () => {
    const quote = computeSettlementQuote(
      [
        { id: 'ppt', price: 10, recordedAt: '2026-09-01T12:00:00.000Z', volume: null, source: 'pokemonpricetracker' },
        { id: 'ebay', price: 20, recordedAt: '2026-09-01T18:00:00.000Z', volume: 4, source: 'ebay' },
        { id: 'tcg', price: 30, recordedAt: '2026-09-02T02:00:00.000Z', volume: 1, source: 'tcgplayer' },
      ],
      AS_OF
    );
    expect(quote?.method).toBe('median');
    expect(quote?.sampleSize).toBe(3);
    expect(quote?.price).toBe(20);
  });

  it('returns null when there is no usable print', () => {
    expect(
      computeSettlementQuote([snap('future', 12, '2026-09-03T00:00:00.000Z')], AS_OF)
    ).toBeNull();
    expect(computeSettlementQuote([snap('zero', 0, '2026-09-02T01:00:00.000Z')], AS_OF)).toBeNull();
  });
});
