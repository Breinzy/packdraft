import { describe, expect, it } from 'vitest';
import { formatDate, formatDateShort, displayChange } from './format';

describe('formatDate', () => {
  it('returns an em dash when the timestamp is missing or invalid', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateShort('')).toBe('—');
  });
});

describe('displayChange', () => {
  it('prefers 24h and falls back to 7d when 24h is unknown', () => {
    expect(displayChange({ change24h: 1.2, change7d: 4 })).toBe(1.2);
    expect(displayChange({ change24h: 0, change7d: 4 })).toBe(4);
  });
});
