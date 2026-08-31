import { describe, expect, it } from 'vitest';
import { returnPct, roundMoney, tradeTotal } from '../money';
import {
  applyBuy,
  applySell,
  applyTrade,
  emptyBook,
  holdingsValue,
  parseQuantity,
  previewBuy,
  rankBooks,
  TradeError,
  unrealizedPnL,
  valuePortfolio,
  type EngineBook,
} from './engine';

const T1 = '11111111-1111-1111-1111-111111111111';
const T2 = '22222222-2222-2222-2222-222222222222';
const U1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const U2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const BOX = 'asset-box';
const ETB = 'asset-etb';

function book(userId: string, cash = 10000, joinedAt = '2026-08-01T00:00:00.000Z'): EngineBook {
  return emptyBook({
    id: `book-${userId}`,
    userId,
    tournamentId: T1,
    startingCash: cash,
    joinedAt,
  });
}

describe('parseQuantity', () => {
  it('accepts positive integers', () => {
    expect(parseQuantity(3)).toBe(3);
    expect(parseQuantity('12')).toBe(12);
  });

  it('rejects fractions and zero', () => {
    expect(() => parseQuantity(1.5)).toThrow(TradeError);
    expect(() => parseQuantity(0)).toThrow(TradeError);
    expect(() => parseQuantity(-1)).toThrow(TradeError);
    expect(() => parseQuantity('1.0')).toThrow(TradeError);
  });
});

describe('buy', () => {
  it('deducts cash, opens a position, and records average cost', () => {
    const next = applyBuy(book(U1), { assetId: BOX, quantity: 2, price: 100.125 });
    expect(next.cash).toBe(roundMoney(10000 - tradeTotal(2, 100.125)));
    expect(next.positions).toEqual([
      { assetId: BOX, quantity: 2, averageCost: roundMoney(100.125) },
    ]);
  });

  it('weights average cost on a second buy', () => {
    const first = applyBuy(book(U1), { assetId: BOX, quantity: 1, price: 100 });
    const second = applyBuy(first, { assetId: BOX, quantity: 1, price: 200 });
    expect(second.positions[0]?.quantity).toBe(2);
    expect(second.positions[0]?.averageCost).toBe(150);
    expect(second.cash).toBe(9700);
  });

  it('rejects insufficient cash', () => {
    expect(() => applyBuy(book(U1, 50), { assetId: BOX, quantity: 1, price: 100 })).toThrow(
      /Insufficient cash/
    );
  });
});

describe('sell', () => {
  it('returns proceeds, reduces quantity, and keeps average cost', () => {
    const owned = applyBuy(book(U1), { assetId: BOX, quantity: 3, price: 100 });
    const sold = applySell(owned, { assetId: BOX, quantity: 1, price: 130 });
    expect(sold.positions[0]).toEqual({ assetId: BOX, quantity: 2, averageCost: 100 });
    expect(sold.cash).toBe(9830);
  });

  it('removes the position when quantity hits zero', () => {
    const owned = applyBuy(book(U1), { assetId: BOX, quantity: 1, price: 100 });
    const sold = applySell(owned, { assetId: BOX, quantity: 1, price: 90 });
    expect(sold.positions).toEqual([]);
    expect(sold.cash).toBe(9990);
  });

  it('rejects insufficient holdings', () => {
    expect(() => applySell(book(U1), { assetId: BOX, quantity: 1, price: 100 })).toThrow(
      /Insufficient holdings/
    );
    const owned = applyBuy(book(U1), { assetId: BOX, quantity: 1, price: 100 });
    expect(() => applySell(owned, { assetId: BOX, quantity: 2, price: 100 })).toThrow(
      /Insufficient holdings/
    );
  });
});

describe('valuation and P&L', () => {
  it('values a book as cash plus marked positions', () => {
    const owned = applyBuy(book(U1), { assetId: BOX, quantity: 2, price: 100 });
    const prices = new Map([[BOX, 150]]);
    expect(holdingsValue(owned.positions, prices)).toBe(300);
    expect(valuePortfolio(owned, prices)).toBe(owned.cash + 300);
    expect(unrealizedPnL(owned.positions[0]!, 150)).toEqual({ amount: 100, pct: 50 });
  });

  it('throws when a holding has no mark (settlement must not invent a price)', () => {
    const owned = applyBuy(book(U1), { assetId: BOX, quantity: 1, price: 100 });
    expect(() => valuePortfolio(owned, new Map())).toThrow(/Missing settlement price/);
  });
});

describe('tournament isolation', () => {
  it('does not move cash or positions between books', () => {
    const a = applyBuy(book(U1), { assetId: BOX, quantity: 1, price: 500 });
    const b = applyBuy(book(U2), { assetId: ETB, quantity: 2, price: 40 });
    expect(a.cash).toBe(9500);
    expect(b.cash).toBe(9920);
    expect(a.positions.map((p) => p.assetId)).toEqual([BOX]);
    expect(b.positions.map((p) => p.assetId)).toEqual([ETB]);
    expect(a.tournamentId).toBe(T1);
    expect(b.userId).not.toBe(a.userId);
  });

  it('keeps a second tournament book independent of the first', () => {
    const t1 = applyBuy(book(U1), { assetId: BOX, quantity: 1, price: 1000 });
    const t2 = emptyBook({
      id: 'book-t2',
      userId: U1,
      tournamentId: T2,
      startingCash: 10000,
      joinedAt: '2026-08-10T00:00:00.000Z',
    });
    expect(t2.cash).toBe(10000);
    expect(t2.positions).toEqual([]);
    expect(t1.cash).toBe(9000);
  });
});

describe('ranking and settlement freeze', () => {
  it('ranks by value, then earlier join, then user id; ranks are unique', () => {
    const a = applyBuy(book(U1, 10000, '2026-08-01T10:00:00.000Z'), {
      assetId: BOX,
      quantity: 1,
      price: 100,
    });
    const b = applyBuy(book(U2, 10000, '2026-08-01T09:00:00.000Z'), {
      assetId: BOX,
      quantity: 1,
      price: 100,
    });
    const live = rankBooks([a, b], new Map([[BOX, 200]]));
    expect(live.map((r) => r.userId)).toEqual([U2, U1]);
    expect(live.map((r) => r.rank)).toEqual([1, 2]);
    expect(new Set(live.map((r) => r.rank)).size).toBe(2);
  });

  it('does not revalue a frozen result when live prices change', () => {
    const a = applyTrade(book(U1, 10000, '2026-08-01T10:00:00.000Z'), 'buy', {
      assetId: BOX,
      quantity: 2,
      price: 100,
    });
    const b = book(U2, 10000, '2026-08-01T11:00:00.000Z');
    const settlement = new Map([[BOX, 150]]);
    const frozen = rankBooks([a, b], settlement);
    const laterLive = rankBooks([a, b], new Map([[BOX, 999]]));

    expect(frozen[0]?.userId).toBe(U1);
    expect(frozen[0]?.portfolioValue).toBe(a.cash + 300);
    expect(frozen[0]?.returnPct).toBe(returnPct(a.cash + 300, 10000));

    expect(laterLive[0]?.portfolioValue).not.toBe(frozen[0]?.portfolioValue);
    // Historical result is the frozen ranking, not the later live mark.
    expect(frozen[0]?.portfolioValue).toBe(10100);
  });
});

describe('previewBuy', () => {
  it('computes remaining cash and a max quantity', () => {
    const preview = previewBuy(1000, 300, 2);
    expect(preview.total).toBe(600);
    expect(preview.remainingCash).toBe(400);
    expect(preview.maxQuantity).toBe(3);
    expect(preview.ok).toBe(true);
  });
});
