import { roundMoney } from '@/lib/money';
import { computeChangePct } from '@/lib/market/stale';
import type { MarketEventType } from '@/types';

export type { MarketEventType };

export type EventDirection = 'up' | 'down';

export type EventPayload =
  | { kind: 'release_price'; assetId: string; predictedPrice: number }
  | { kind: 'direction'; assetId: string; direction: EventDirection }
  | { kind: 'ranking'; assetIds: string[] }
  | { kind: 'biggest_mover'; assetId: string };

export interface EventAssetMarks {
  assetId: string;
  startPrice: number | null;
  endPrice: number | null;
}

export class EventEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventEntryError';
  }
}

export function parsePredictedPrice(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    throw new EventEntryError('Predicted price must be a positive number');
  }
  return roundMoney(n);
}

export function parseEventPayload(
  type: MarketEventType,
  raw: Record<string, unknown>,
  allowedAssetIds: string[]
): EventPayload {
  const allowed = new Set(allowedAssetIds);
  if (allowed.size === 0) throw new EventEntryError('Event has no assets');

  const assetId = typeof raw.assetId === 'string' ? raw.assetId : typeof raw.asset_id === 'string' ? raw.asset_id : '';

  if (type === 'release_price') {
    const id = assetId || (allowedAssetIds.length === 1 ? allowedAssetIds[0]! : '');
    if (!allowed.has(id)) throw new EventEntryError('Pick an asset in this event');
    const predicted =
      raw.predictedPrice ?? raw.predicted_price ?? raw.price;
    return { kind: 'release_price', assetId: id, predictedPrice: parsePredictedPrice(predicted) };
  }

  if (type === 'direction') {
    const id = assetId || (allowedAssetIds.length === 1 ? allowedAssetIds[0]! : '');
    if (!allowed.has(id)) throw new EventEntryError('Pick an asset in this event');
    const direction = raw.direction;
    if (direction !== 'up' && direction !== 'down') {
      throw new EventEntryError('Direction must be up or down');
    }
    return { kind: 'direction', assetId: id, direction };
  }

  if (type === 'biggest_mover') {
    if (!allowed.has(assetId)) throw new EventEntryError('Pick an asset in this event');
    return { kind: 'biggest_mover', assetId };
  }

  const listRaw = raw.assetIds ?? raw.asset_ids;
  if (!Array.isArray(listRaw)) throw new EventEntryError('Rank every asset in this event');
  const assetIds = listRaw.map((id) => String(id));
  if (assetIds.length !== allowedAssetIds.length) {
    throw new EventEntryError('Rank every asset in this event');
  }
  const seen = new Set<string>();
  for (const id of assetIds) {
    if (!allowed.has(id) || seen.has(id)) {
      throw new EventEntryError('Ranking must be a permutation of the event assets');
    }
    seen.add(id);
  }
  return { kind: 'ranking', assetIds };
}

export function payloadToJson(payload: EventPayload): Record<string, unknown> {
  if (payload.kind === 'release_price') {
    return { kind: payload.kind, asset_id: payload.assetId, predicted_price: payload.predictedPrice };
  }
  if (payload.kind === 'direction') {
    return { kind: payload.kind, asset_id: payload.assetId, direction: payload.direction };
  }
  if (payload.kind === 'biggest_mover') {
    return { kind: payload.kind, asset_id: payload.assetId };
  }
  return { kind: payload.kind, asset_ids: payload.assetIds };
}

export function payloadFromStored(
  type: MarketEventType,
  raw: unknown,
  allowedAssetIds: string[]
): EventPayload {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return parseEventPayload(type, obj, allowedAssetIds);
}

export function pctChange(start: number | null, end: number | null): number | null {
  if (start == null || end == null || !(start > 0)) return null;
  return computeChangePct(end, start);
}

export function scoreReleasePrice(predicted: number, actual: number | null): number {
  if (actual == null || !(actual > 0)) return 0;
  const errorPct = (Math.abs(predicted - actual) / actual) * 100;
  return roundMoney(Math.max(0, 100 - errorPct));
}

export function scoreDirection(
  direction: EventDirection,
  start: number | null,
  end: number | null
): number {
  if (start == null || end == null) return 0;
  if (end === start) return 0;
  const rose = end > start;
  if (direction === 'up' && rose) return 1;
  if (direction === 'down' && !rose) return 1;
  return 0;
}

export function scoreBiggestMover(
  pickedAssetId: string,
  marks: EventAssetMarks[]
): number {
  let best = -Infinity;
  const winners = new Set<string>();
  for (const row of marks) {
    const change = pctChange(row.startPrice, row.endPrice);
    if (change == null) continue;
    const abs = Math.abs(change);
    if (abs > best + 1e-9) {
      best = abs;
      winners.clear();
      winners.add(row.assetId);
    } else if (Math.abs(abs - best) <= 1e-9) {
      winners.add(row.assetId);
    }
  }
  if (best === -Infinity) return 0;
  return winners.has(pickedAssetId) ? 1 : 0;
}

/** Spearman rank correlation mapped to 0–100. Perfect order is 100. */
export function scoreRanking(predictedOrder: string[], marks: EventAssetMarks[]): number {
  const actual = [...marks]
    .map((row) => ({ id: row.assetId, change: pctChange(row.startPrice, row.endPrice) }))
    .filter((row) => row.change != null) as { id: string; change: number }[];
  if (actual.length < 2) return 0;

  actual.sort((a, b) => {
    if (b.change !== a.change) return b.change - a.change;
    return a.id < b.id ? -1 : 1;
  });

  const actualRank = new Map<string, number>();
  actual.forEach((row, i) => actualRank.set(row.id, i + 1));

  const predicted = predictedOrder.filter((id) => actualRank.has(id));
  const n = predicted.length;
  if (n < 2) return 0;

  let sumSq = 0;
  predicted.forEach((id, i) => {
    const d = i + 1 - (actualRank.get(id) ?? i + 1);
    sumSq += d * d;
  });
  const denom = n * (n * n - 1);
  if (denom === 0) return 0;
  const spearman = 1 - (6 * sumSq) / denom;
  return roundMoney(((spearman + 1) / 2) * 100);
}

export function scoreEventEntry(
  payload: EventPayload,
  marks: EventAssetMarks[]
): { score: number; detail: Record<string, unknown> } {
  const byId = new Map(marks.map((m) => [m.assetId, m]));

  if (payload.kind === 'release_price') {
    const mark = byId.get(payload.assetId);
    const score = scoreReleasePrice(payload.predictedPrice, mark?.endPrice ?? null);
    return {
      score,
      detail: {
        predicted: payload.predictedPrice,
        actual: mark?.endPrice ?? null,
      },
    };
  }

  if (payload.kind === 'direction') {
    const mark = byId.get(payload.assetId);
    const score = scoreDirection(payload.direction, mark?.startPrice ?? null, mark?.endPrice ?? null);
    return {
      score,
      detail: {
        direction: payload.direction,
        start: mark?.startPrice ?? null,
        end: mark?.endPrice ?? null,
        change: pctChange(mark?.startPrice ?? null, mark?.endPrice ?? null),
      },
    };
  }

  if (payload.kind === 'biggest_mover') {
    const score = scoreBiggestMover(payload.assetId, marks);
    return { score, detail: { picked: payload.assetId } };
  }

  const score = scoreRanking(payload.assetIds, marks);
  return { score, detail: { predicted: payload.assetIds } };
}

export interface EventResultRow {
  userId: string;
  submittedAt: string;
  score: number;
  detail: Record<string, unknown>;
  rank: number;
}

export function rankEventScores(
  rows: Omit<EventResultRow, 'rank'>[]
): EventResultRow[] {
  const ordered = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.submittedAt !== b.submittedAt) return a.submittedAt < b.submittedAt ? -1 : 1;
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });
  return ordered.map((row, i) => ({ ...row, rank: i + 1 }));
}
