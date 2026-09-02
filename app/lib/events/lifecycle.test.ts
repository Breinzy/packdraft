import { describe, expect, it } from 'vitest';
import { canEnterStatus, tickEventStatus } from './lifecycle';

describe('tickEventStatus', () => {
  const opens = '2026-09-01T00:00:00.000Z';
  const locks = '2026-09-02T00:00:00.000Z';
  const settles = '2026-09-03T00:00:00.000Z';

  it('opens, locks, then marks settling from the clock', () => {
    expect(tickEventStatus('upcoming', opens, locks, settles, new Date(opens))).toBe('open');
    expect(tickEventStatus('open', opens, locks, settles, new Date(locks))).toBe('locked');
    expect(tickEventStatus('locked', opens, locks, settles, new Date(settles))).toBe('settling');
  });

  it('does not auto-complete from the clock', () => {
    expect(
      tickEventStatus('settling', opens, locks, settles, new Date('2026-09-10T00:00:00.000Z'))
    ).toBe('settling');
  });

  it('only accepts entries while open', () => {
    expect(canEnterStatus('open')).toBe(true);
    expect(canEnterStatus('locked')).toBe(false);
    expect(canEnterStatus('upcoming')).toBe(false);
  });
});
