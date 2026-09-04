import { computeChangePct } from './stale';

export type IndexSnapshot = {
  assetId: string;
  price: number;
  recordedAt: string;
};

export type SetIndex = {
  price: number;
  change30d: number;
  history: number[];
  trackedCount: number;
  sealedCount: number;
  cardCount: number;
  pricedCount: number;
};

export function basketValue(prices: Iterable<number>): number {
  let sum = 0;
  for (const price of prices) {
    if (Number.isFinite(price) && price > 0) sum += price;
  }
  return Number(sum.toFixed(2));
}

export function indexChangePct(current: number, previous: number): number {
  return Number(computeChangePct(current, previous).toFixed(2));
}

function utcDay(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/**
 * One basket level per UTC day that has at least one member snapshot, plus `now`
 * if that day is not already present. Last observation is carried forward so a
 * set's cards and sealed products share one series. Days without any observation
 * are not fabricated.
 */
export function observationDayBaskets(
  snapshots: IndexSnapshot[],
  now: Date = new Date()
): number[] {
  const usable = snapshots
    .map((row) => ({
      assetId: row.assetId,
      price: Number(row.price),
      recordedAt: new Date(row.recordedAt).getTime(),
      day: utcDay(row.recordedAt),
    }))
    .filter((row) => row.assetId && Number.isFinite(row.price) && row.price > 0 && Number.isFinite(row.recordedAt) && row.day);

  if (usable.length === 0) return [];

  usable.sort((a, b) => a.recordedAt - b.recordedAt);

  const days = [...new Set(usable.map((row) => row.day))];
  const today = utcDay(now);
  if (today && !days.includes(today)) days.push(today);
  days.sort();

  const last = new Map<string, number>();
  let index = 0;
  const history: number[] = [];

  for (const day of days) {
    const end = Date.parse(`${day}T23:59:59.999Z`);
    while (index < usable.length && usable[index].recordedAt <= end) {
      last.set(usable[index].assetId, usable[index].price);
      index += 1;
    }
    const value = basketValue(last.values());
    if (value > 0) history.push(value);
  }

  return history;
}

export function emptySetIndex(): SetIndex {
  return {
    price: 0,
    change30d: 0,
    history: [],
    trackedCount: 0,
    sealedCount: 0,
    cardCount: 0,
    pricedCount: 0,
  };
}

/** Real basket values at sampled as-of times. Duplicate consecutive levels are dropped. */
export function sampledIndexHistory(values: Array<number | null | undefined>): number[] {
  const history: number[] = [];
  for (const value of values) {
    if (value == null || !Number.isFinite(value) || value <= 0) continue;
    const rounded = Number(value.toFixed(2));
    if (history.length === 0 || history[history.length - 1] !== rounded) history.push(rounded);
  }
  return history;
}

export function buildSetIndex(input: {
  currentPrice: number;
  price30d?: number | null;
  history?: number[];
  trackedCount: number;
  sealedCount: number;
  cardCount: number;
  pricedCount: number;
}): SetIndex {
  const price = Number.isFinite(input.currentPrice) && input.currentPrice > 0 ? Number(input.currentPrice.toFixed(2)) : 0;
  const previous = input.price30d != null && input.price30d > 0 ? Number(input.price30d) : null;
  const history =
    input.history && input.history.length > 0
      ? input.history
      : previous && previous !== price
        ? [previous, price].filter((value) => value > 0)
        : price > 0
          ? [price]
          : [];
  return {
    price,
    change30d: previous != null ? indexChangePct(price, previous) : 0,
    history,
    trackedCount: input.trackedCount,
    sealedCount: input.sealedCount,
    cardCount: input.cardCount,
    pricedCount: input.pricedCount,
  };
}
