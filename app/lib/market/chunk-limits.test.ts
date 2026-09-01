import { describe, expect, it } from 'vitest';
import { capTimeBudgetMs, shouldStopChunk, VERCEL_MAX_DURATION_MS } from './chunk-limits';

describe('shouldStopChunk', () => {
  const base = {
    startedAtMs: Date.now(),
    timeBudgetMs: 60_000,
    creditsUsed: 10,
    creditBudget: 100,
    dailyRemaining: 500,
    minDailyRemaining: 25,
  };

  it('stops when the time budget is exhausted', () => {
    expect(
      shouldStopChunk({
        ...base,
        startedAtMs: Date.now() - 61_000,
      })
    ).toBe('time');
  });

  it('stops when the chunk credit budget is exhausted', () => {
    expect(shouldStopChunk({ ...base, creditsUsed: 100 })).toBe('credits');
  });

  it('stops when PPT daily remaining is at the floor', () => {
    expect(shouldStopChunk({ ...base, dailyRemaining: 25 })).toBe('daily_limit');
    expect(shouldStopChunk({ ...base, dailyRemaining: 24 })).toBe('daily_limit');
  });

  it('continues when remaining credits are healthy', () => {
    expect(shouldStopChunk(base)).toBeNull();
    expect(shouldStopChunk({ ...base, dailyRemaining: null })).toBeNull();
  });
});

describe('capTimeBudgetMs', () => {
  it('never uses the full Vercel maxDuration', () => {
    expect(capTimeBudgetMs(10 * 60_000, 240_000)).toBe(VERCEL_MAX_DURATION_MS - 45_000);
  });

  it('falls back to the default when unset', () => {
    expect(capTimeBudgetMs(undefined, 240_000)).toBe(240_000);
  });
});
