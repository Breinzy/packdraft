import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeChangePct, isPriceStale } from './stale.ts';

describe('isPriceStale', () => {
  it('is fresh within 36 hours', () => {
    const now = new Date('2026-08-31T18:00:00.000Z');
    const recorded = new Date('2026-08-30T12:00:00.000Z');
    assert.equal(isPriceStale(recorded, now), false);
  });

  it('is stale after 36 hours', () => {
    const now = new Date('2026-08-31T18:00:00.000Z');
    const recorded = new Date('2026-08-29T17:00:00.000Z');
    assert.equal(isPriceStale(recorded, now), true);
  });

  it('treats invalid timestamps as stale', () => {
    assert.equal(isPriceStale('not-a-date', new Date()), true);
  });
});

describe('computeChangePct', () => {
  it('computes a gain', () => {
    assert.equal(computeChangePct(110, 100), 10);
  });

  it('returns 0 when previous is 0', () => {
    assert.equal(computeChangePct(10, 0), 0);
  });
});
