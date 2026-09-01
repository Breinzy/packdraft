import { describe, expect, it } from 'vitest';
import { formatTimestamp } from './utils';

describe('formatTimestamp', () => {
  it('formats a UTC instant without depending on the host locale', () => {
    expect(formatTimestamp('2026-09-01T17:08:49.788Z')).toBe('Sep 1, 2026, 5:08 PM UTC');
  });

  it('returns an em dash for invalid input', () => {
    expect(formatTimestamp('not-a-date')).toBe('—');
  });
});
