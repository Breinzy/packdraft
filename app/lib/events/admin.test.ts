import { describe, expect, it } from 'vitest';
import { parseCreateMarketEventInput } from './admin';

describe('parseCreateMarketEventInput', () => {
  it('defaults a 24h open window and 24h settle window', () => {
    const parsed = parseCreateMarketEventInput({
      name: 'Set drop',
      type: 'direction',
      opensAt: '2026-09-01T00:00:00.000Z',
    });
    expect(parsed.locksAt.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(parsed.settlesAt.toISOString()).toBe('2026-09-03T00:00:00.000Z');
    expect(parsed.assetCount).toBe(4);
  });

  it('rejects ranking events that are too small', () => {
    expect(() =>
      parseCreateMarketEventInput({ name: 'Rank', type: 'ranking', assetIds: ['a', 'b'] })
    ).toThrow(/at least 3/);
  });

  it('rejects a settle time before lock', () => {
    expect(() =>
      parseCreateMarketEventInput({
        name: 'Bad',
        type: 'biggest_mover',
        opensAt: '2026-09-01T00:00:00.000Z',
        locksAt: '2026-09-02T00:00:00.000Z',
        settlesAt: '2026-09-01T12:00:00.000Z',
      })
    ).toThrow(/Settle time/);
  });
});
