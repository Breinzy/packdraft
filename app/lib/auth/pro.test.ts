import { describe, expect, it } from 'vitest';
import { careerChartLimit, isPro, priceHistoryLimit } from './pro';

describe('isPro', () => {
  it('is true only while pro_until is in the future', () => {
    const now = new Date('2026-09-02T12:00:00.000Z');
    expect(isPro('2026-09-03T00:00:00.000Z', now)).toBe(true);
    expect(isPro('2026-09-01T00:00:00.000Z', now)).toBe(false);
    expect(isPro(null, now)).toBe(false);
  });

  it('does not change tournament math — only history depth', () => {
    expect(priceHistoryLimit(false)).toBe(14);
    expect(priceHistoryLimit(true)).toBe(90);
    expect(careerChartLimit(true)).toBeGreaterThan(careerChartLimit(false));
  });
});
