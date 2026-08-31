import { describe, expect, it } from 'vitest';
import {
  canJoinStatus,
  canTradeStatus,
  isSettledStatus,
  tickStatus,
  valuationAsOf,
} from './lifecycle';

describe('tickStatus', () => {
  const start = '2026-08-01T00:00:00.000Z';
  const close = '2026-08-08T00:00:00.000Z';

  it('stays upcoming before start', () => {
    expect(tickStatus('upcoming', start, close, new Date('2026-07-31T23:59:59.000Z'))).toBe(
      'upcoming'
    );
  });

  it('opens at start', () => {
    expect(tickStatus('upcoming', start, close, new Date(start))).toBe('active');
  });

  it('locks at trading close', () => {
    expect(tickStatus('active', start, close, new Date(close))).toBe('locked');
  });

  it('does not reopen completed results', () => {
    expect(tickStatus('completed', start, close, new Date('2026-09-01T00:00:00.000Z'))).toBe(
      'completed'
    );
  });
});

describe('permissions', () => {
  it('allows join in upcoming and active only', () => {
    expect(canJoinStatus('upcoming')).toBe(true);
    expect(canJoinStatus('active')).toBe(true);
    expect(canJoinStatus('locked')).toBe(false);
    expect(canJoinStatus('completed')).toBe(false);
  });

  it('allows trading only while active', () => {
    expect(canTradeStatus('active')).toBe(true);
    expect(canTradeStatus('upcoming')).toBe(false);
    expect(canTradeStatus('locked')).toBe(false);
  });

  it('treats completed results as frozen', () => {
    const closeAt = '2026-08-08T00:00:00.000Z';
    expect(isSettledStatus('completed')).toBe(true);
    expect(valuationAsOf('completed', closeAt).toISOString()).toBe(closeAt);
    expect(
      valuationAsOf('active', closeAt, new Date('2026-08-03T00:00:00.000Z')).toISOString()
    ).toBe('2026-08-03T00:00:00.000Z');
  });
});
