import { roundMoney } from '@/lib/money';

/** Inclusive lookback used for competition settlement. */
export const SETTLEMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Provider volume is stored on snapshots but is not a hard exclude.
 * `price_snapshots.volume` defaults to 0 when the provider omits it, so treating
 * 0 as "no trades" would collapse almost every window back to last sale.
 */
export const SETTLEMENT_MIN_VOLUME = 0;

export type SettlementMethod = 'median' | 'mean' | 'single' | 'fallback';

export interface SettlementSnapshot {
  id: string;
  price: number;
  recordedAt: string;
  volume: number | null;
  source?: string;
}

export interface SettlementQuote {
  price: number;
  method: SettlementMethod;
  sampleSize: number;
  snapshotId: string | null;
  recordedAt: string;
}

/**
 * Postgres `percentile_cont(p)` over an ordered set: linear interpolation
 * at index `(n - 1) * p`.
 */
export function percentileCont(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    throw new Error('percentileCont requires at least one value');
  }
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const weight = idx - lo;
  return sorted[lo]! * (1 - weight) + sorted[hi]! * weight;
}

function asOfMs(asOf: Date | string): number {
  const ms = asOf instanceof Date ? asOf.getTime() : new Date(asOf).getTime();
  if (Number.isNaN(ms)) throw new Error('Invalid settlement as-of time');
  return ms;
}

export function qualifyingWindowSnapshots(
  snapshots: SettlementSnapshot[],
  asOf: Date | string
): SettlementSnapshot[] {
  const end = asOfMs(asOf);
  const start = end - SETTLEMENT_WINDOW_MS;
  return snapshots.filter((row) => {
    const at = new Date(row.recordedAt).getTime();
    if (Number.isNaN(at) || at > end || at < start) return false;
    if (!(row.price > 0)) return false;
    if (SETTLEMENT_MIN_VOLUME > 0 && row.volume != null && row.volume < SETTLEMENT_MIN_VOLUME) {
      return false;
    }
    return true;
  });
}

function dropIqrOutliers(rows: SettlementSnapshot[]): SettlementSnapshot[] {
  if (rows.length < 4) return rows;
  const prices = [...rows.map((r) => r.price)].sort((a, b) => a - b);
  const q1 = percentileCont(prices, 0.25);
  const q3 = percentileCont(prices, 0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return rows;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const kept = rows.filter((r) => r.price >= lo && r.price <= hi);
  return kept.length > 0 ? kept : rows;
}

function latestAtOrBefore(
  snapshots: SettlementSnapshot[],
  asOf: Date | string
): SettlementSnapshot | null {
  const end = asOfMs(asOf);
  let best: SettlementSnapshot | null = null;
  let bestAt = -Infinity;
  for (const row of snapshots) {
    if (!(row.price > 0)) continue;
    const at = new Date(row.recordedAt).getTime();
    if (Number.isNaN(at) || at > end) continue;
    if (at > bestAt) {
      best = row;
      bestAt = at;
    }
  }
  return best;
}

/**
 * Competition settlement price. Not "last sale".
 *
 * Window: snapshots with `recorded_at` in `[as_of - 24h, as_of]`, price > 0,
 * All sources in that window are included. Volume is not a hard exclude while
 * the column still defaults to 0 for unknown prints.
 *
 * If 4+ qualifying prints exist, Tukey IQR fences drop outliers.
 * Then: median if 3+, mean if 2, the print if 1.
 * If the window is empty, fall back to the latest snapshot at or before as_of.
 * If that is also missing, return null (caller must fail the competition).
 */
export function computeSettlementQuote(
  snapshots: SettlementSnapshot[],
  asOf: Date | string
): SettlementQuote | null {
  const asOfIso = asOf instanceof Date ? asOf.toISOString() : new Date(asOf).toISOString();
  const windowed = qualifyingWindowSnapshots(snapshots, asOf);
  const filtered = dropIqrOutliers(windowed);
  const n = filtered.length;

  if (n >= 3) {
    const prices = [...filtered.map((r) => r.price)].sort((a, b) => a - b);
    return {
      price: roundMoney(percentileCont(prices, 0.5)),
      method: 'median',
      sampleSize: n,
      snapshotId: null,
      recordedAt: asOfIso,
    };
  }

  if (n === 2) {
    const mean = (filtered[0]!.price + filtered[1]!.price) / 2;
    return {
      price: roundMoney(mean),
      method: 'mean',
      sampleSize: 2,
      snapshotId: null,
      recordedAt: asOfIso,
    };
  }

  if (n === 1) {
    const row = filtered[0]!;
    return {
      price: roundMoney(row.price),
      method: 'single',
      sampleSize: 1,
      snapshotId: row.id,
      recordedAt: row.recordedAt,
    };
  }

  const fallback = latestAtOrBefore(snapshots, asOf);
  if (!fallback) return null;
  return {
    price: roundMoney(fallback.price),
    method: 'fallback',
    sampleSize: 1,
    snapshotId: fallback.id,
    recordedAt: fallback.recordedAt,
  };
}

export function computeSettlementPrice(
  snapshots: SettlementSnapshot[],
  asOf: Date | string
): number | null {
  return computeSettlementQuote(snapshots, asOf)?.price ?? null;
}
