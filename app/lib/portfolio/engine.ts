import { returnPct, roundMoney, tradeTotal } from '@/lib/money';

export class TradeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TradeError';
  }
}

export interface EnginePosition {
  assetId: string;
  quantity: number;
  averageCost: number;
}

export interface EngineBook {
  id: string;
  userId: string;
  tournamentId: string;
  startingCash: number;
  cash: number;
  positions: EnginePosition[];
  joinedAt: string;
}

export interface EngineFill {
  assetId: string;
  quantity: number;
  price: number;
}

export interface EngineStanding {
  userId: string;
  cash: number;
  holdingsValue: number;
  portfolioValue: number;
  returnPct: number;
  rank: number;
  joinedAt: string;
}

export function parseQuantity(raw: unknown): number {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw <= 0 || !Number.isSafeInteger(raw)) {
      throw new TradeError('Quantity must be a positive integer');
    }
    return raw;
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    if (n <= 0 || !Number.isSafeInteger(n)) {
      throw new TradeError('Quantity must be a positive integer');
    }
    return n;
  }
  throw new TradeError('Quantity must be a positive integer');
}

export function parseSide(raw: unknown): 'buy' | 'sell' {
  if (raw === 'buy' || raw === 'sell') return raw;
  throw new TradeError('Side must be buy or sell');
}

function cloneBook(book: EngineBook): EngineBook {
  return {
    ...book,
    positions: book.positions.map((p) => ({ ...p })),
  };
}

export function applyBuy(book: EngineBook, fill: EngineFill): EngineBook {
  const quantity = parseQuantity(fill.quantity);
  if (!(fill.price > 0)) throw new TradeError('No market price available');

  const next = cloneBook(book);
  const total = tradeTotal(quantity, fill.price);
  if (total > next.cash) throw new TradeError('Insufficient cash');

  const existing = next.positions.find((p) => p.assetId === fill.assetId);
  if (!existing) {
    next.positions.push({
      assetId: fill.assetId,
      quantity,
      averageCost: roundMoney(fill.price),
    });
  } else {
    const newQty = existing.quantity + quantity;
    existing.averageCost = roundMoney(
      (existing.quantity * existing.averageCost + total) / newQty
    );
    existing.quantity = newQty;
  }

  next.cash = roundMoney(next.cash - total);
  return next;
}

export function applySell(book: EngineBook, fill: EngineFill): EngineBook {
  const quantity = parseQuantity(fill.quantity);
  if (!(fill.price > 0)) throw new TradeError('No market price available');

  const next = cloneBook(book);
  const existing = next.positions.find((p) => p.assetId === fill.assetId);
  if (!existing || existing.quantity < quantity) {
    throw new TradeError('Insufficient holdings');
  }

  const total = tradeTotal(quantity, fill.price);
  const remaining = existing.quantity - quantity;
  if (remaining === 0) {
    next.positions = next.positions.filter((p) => p.assetId !== fill.assetId);
  } else {
    existing.quantity = remaining;
  }

  next.cash = roundMoney(next.cash + total);
  return next;
}

export function applyTrade(
  book: EngineBook,
  side: 'buy' | 'sell',
  fill: EngineFill
): EngineBook {
  return side === 'buy' ? applyBuy(book, fill) : applySell(book, fill);
}

export function holdingsValue(
  positions: EnginePosition[],
  prices: Map<string, number>
): number {
  let total = 0;
  for (const position of positions) {
    const price = prices.get(position.assetId);
    if (price == null) {
      throw new TradeError('Missing settlement price for one or more holdings');
    }
    total += position.quantity * price;
  }
  return roundMoney(total);
}

export function valuePortfolio(book: EngineBook, prices: Map<string, number>): number {
  return roundMoney(book.cash + holdingsValue(book.positions, prices));
}

export function unrealizedPnL(
  position: EnginePosition,
  markPrice: number
): { amount: number; pct: number } {
  const cost = position.quantity * position.averageCost;
  const market = position.quantity * markPrice;
  const amount = roundMoney(market - cost);
  const pct = position.averageCost === 0 ? 0 : returnPct(markPrice, position.averageCost);
  return { amount, pct };
}

export function previewBuy(cash: number, price: number, quantity: number): {
  total: number;
  remainingCash: number;
  maxQuantity: number;
  ok: boolean;
} {
  const qty = parseQuantity(quantity);
  const total = tradeTotal(qty, price);
  const maxQuantity = price > 0 ? Math.floor(cash / price) : 0;
  return {
    total,
    remainingCash: roundMoney(cash - total),
    maxQuantity,
    ok: total <= cash && qty > 0 && price > 0,
  };
}

export function previewSell(owned: number, price: number, quantity: number): {
  total: number;
  remainingQty: number;
  ok: boolean;
} {
  const qty = parseQuantity(quantity);
  return {
    total: tradeTotal(qty, price),
    remainingQty: owned - qty,
    ok: owned >= qty && price > 0,
  };
}

export function rankBooks(
  books: EngineBook[],
  prices: Map<string, number>
): EngineStanding[] {
  const rows = books.map((book) => {
    const hv = holdingsValue(book.positions, prices);
    const portfolioValue = roundMoney(book.cash + hv);
    return {
      userId: book.userId,
      cash: roundMoney(book.cash),
      holdingsValue: hv,
      portfolioValue,
      returnPct: returnPct(portfolioValue, book.startingCash),
      joinedAt: book.joinedAt,
    };
  });

  rows.sort((a, b) => {
    if (b.portfolioValue !== a.portfolioValue) return b.portfolioValue - a.portfolioValue;
    if (a.joinedAt !== b.joinedAt) return a.joinedAt < b.joinedAt ? -1 : 1;
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });

  return rows.map((row, index) => ({
    userId: row.userId,
    cash: row.cash,
    holdingsValue: row.holdingsValue,
    portfolioValue: row.portfolioValue,
    returnPct: row.returnPct,
    rank: index + 1,
    joinedAt: row.joinedAt,
  }));
}

export function emptyBook(input: {
  id: string;
  userId: string;
  tournamentId: string;
  startingCash: number;
  joinedAt: string;
}): EngineBook {
  return {
    id: input.id,
    userId: input.userId,
    tournamentId: input.tournamentId,
    startingCash: input.startingCash,
    cash: input.startingCash,
    positions: [],
    joinedAt: input.joinedAt,
  };
}
