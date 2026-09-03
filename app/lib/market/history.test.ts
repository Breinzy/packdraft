import { describe, expect, it } from 'vitest';
import {
  dailyUpdateTier,
  extractHistoryPoints,
  isAlwaysDailySealed,
  recordedAtForDay,
  sealedSubtypeFromAsset,
  volumeWindows,
} from './history';

describe('extractHistoryPoints', () => {
  it('reads a flat PPT history array including volume', () => {
    const points = extractHistoryPoints({
      priceHistory: [
        { date: '2026-08-01', price: 10, volume: 4 },
        { date: '2026-08-02T18:00:00Z', price: 11, volume: 1 },
      ],
    });
    expect(points).toEqual([
      { date: '2026-08-01', price: 10, volume: 4 },
      { date: '2026-08-02', price: 11, volume: 1 },
    ]);
  });

  it('prefers Near Mint variant history over played conditions', () => {
    const points = extractHistoryPoints({
      priceHistory: {
        variants: {
          Normal: {
            'Lightly Played': {
              history: [{ date: '2026-08-01', price: 8, volume: 99 }],
            },
            'Near Mint': {
              history: [
                { date: '2026-08-01', price: 12, volume: 5 },
                { date: '2026-08-02', price: 13, volume: 2 },
              ],
            },
          },
        },
      },
    });
    expect(points).toEqual([
      { date: '2026-08-01', price: 12, volume: 5 },
      { date: '2026-08-02', price: 13, volume: 2 },
    ]);
  });

  it('drops zero/invalid prices', () => {
    expect(
      extractHistoryPoints({
        priceHistory: [
          { date: '2026-08-01', price: 0, volume: 4 },
          { date: 'nope', price: 9, volume: 1 },
        ],
      })
    ).toEqual([]);
  });
});

describe('volumeWindows', () => {
  it('sums copies sold inside 7 / 30 / 180 day windows', () => {
    const now = new Date('2026-09-02T15:00:00.000Z');
    const windows = volumeWindows(
      [
        { date: '2026-08-28', price: 1, volume: 3 },
        { date: '2026-08-10', price: 1, volume: 7 },
        { date: '2026-04-01', price: 1, volume: 40 },
        { date: '2026-02-01', price: 1, volume: 100 },
      ],
      now
    );
    expect(windows).toEqual({ volume7d: 3, volume30d: 10, volume180d: 50 });
  });
});

describe('dailyUpdateTier', () => {
  it('always updates ETBs and booster boxes', () => {
    expect(isAlwaysDailySealed('etb')).toBe(true);
    expect(isAlwaysDailySealed('booster_box')).toBe(true);
    expect(isAlwaysDailySealed('upc')).toBe(false);
    expect(
      dailyUpdateTier({ assetType: 'sealed', sealedSubtype: 'etb', volume30d: 0 })
    ).toBe('always');
    expect(
      dailyUpdateTier({ assetType: 'sealed', sealedSubtype: 'booster_box', volume30d: 0 })
    ).toBe('always');
  });

  it('ranks cards by 30-day volume', () => {
    expect(dailyUpdateTier({ assetType: 'single', volume30d: 10 })).toBe('high');
    expect(dailyUpdateTier({ assetType: 'single', volume30d: 1 })).toBe('normal');
    expect(dailyUpdateTier({ assetType: 'single', volume30d: 0 })).toBe('skip');
  });

  it('reads sealed subtype from metadata or the product name', () => {
    expect(
      sealedSubtypeFromAsset('sealed', 'Surging Sparks Elite Trainer Box', {})
    ).toBe('etb');
    expect(
      sealedSubtypeFromAsset('sealed', 'Whatever', { sealedSubtype: 'booster_box' })
    ).toBe('booster_box');
    expect(sealedSubtypeFromAsset('single', 'Charizard', {})).toBeNull();
  });
});

describe('recordedAtForDay', () => {
  it('pins snapshot time to noon UTC so re-runs stay stable', () => {
    expect(recordedAtForDay('2026-08-01T19:22:00Z')).toBe('2026-08-01T12:00:00.000Z');
  });
});
