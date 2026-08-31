import { describe, expect, it } from 'vitest';
import { computeChangePct, isPriceStale } from './stale';

describe('isPriceStale', () => {
  it('is fresh within 36 hours', () => {
    const now = new Date('2026-08-31T18:00:00.000Z');
    const recorded = new Date('2026-08-30T12:00:00.000Z');
    expect(isPriceStale(recorded, now)).toBe(false);
  });

  it('is stale after 36 hours', () => {
    const now = new Date('2026-08-31T18:00:00.000Z');
    const recorded = new Date('2026-08-29T17:00:00.000Z');
    expect(isPriceStale(recorded, now)).toBe(true);
  });

  it('treats invalid timestamps as stale', () => {
    expect(isPriceStale('not-a-date', new Date())).toBe(true);
  });
});

describe('computeChangePct', () => {
  it('computes a gain', () => {
    expect(computeChangePct(110, 100)).toBe(10);
  });

  it('returns 0 when previous is 0', () => {
    expect(computeChangePct(10, 0)).toBe(0);
  });
});
