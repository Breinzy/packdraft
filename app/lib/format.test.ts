import { describe, expect, it } from 'vitest';
import { formatDate, formatDateShort } from './format';

describe('formatDate', () => {
  it('returns an em dash when the timestamp is missing or invalid', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateShort('')).toBe('—');
  });
});
