import { describe, expect, it } from 'vitest';
import { returnPct, roundMoney, tradeTotal } from './money';

describe('roundMoney', () => {
  it('rounds to cents', () => {
    expect(roundMoney(10.125)).toBe(10.13);
    expect(roundMoney(10.124)).toBe(10.12);
  });

  it('returns 0 for non-finite values', () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('tradeTotal', () => {
  it('matches qty × price rounded to cents', () => {
    expect(tradeTotal(3, 19.99)).toBe(59.97);
  });
});

describe('returnPct', () => {
  it('computes gain and loss to 4 decimal places', () => {
    expect(returnPct(11000, 10000)).toBe(10);
    expect(returnPct(9000, 10000)).toBe(-10);
  });

  it('returns 0 when starting cash is 0', () => {
    expect(returnPct(50, 0)).toBe(0);
  });
});
