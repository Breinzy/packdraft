import { classifySealedSubtype } from './normalize';

export const HISTORY_DAYS = 180;
export const HIGH_VOLUME_30D = 10;
export const ALWAYS_SEALED_SUBTYPES = ['etb', 'booster_box'] as const;

export type DailyUpdateTier = 'always' | 'high' | 'normal' | 'skip';
export type AlwaysSealedSubtype = (typeof ALWAYS_SEALED_SUBTYPES)[number];

export interface HistoryPoint {
  date: string;
  price: number;
  volume: number;
}

export interface VolumeWindows {
  volume7d: number;
  volume30d: number;
  volume180d: number;
}

const PREFERRED_CONDITIONS = [
  'near mint',
  'nm',
  'unopened',
  'sealed',
  'ungraded',
];

export function isAlwaysDailySealed(subtype: string | null | undefined): boolean {
  return subtype === 'etb' || subtype === 'booster_box';
}

export function sealedSubtypeFromAsset(
  assetType: string,
  name: string,
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (assetType !== 'sealed') return null;
  const fromMeta = metadata?.sealedSubtype;
  if (typeof fromMeta === 'string' && fromMeta.length > 0) return fromMeta;
  return classifySealedSubtype(name);
}

export function dailyUpdateTier(input: {
  assetType: string;
  sealedSubtype?: string | null;
  volume30d: number;
}): DailyUpdateTier {
  if (input.assetType === 'sealed' && isAlwaysDailySealed(input.sealedSubtype)) {
    return 'always';
  }
  if (input.volume30d >= HIGH_VOLUME_30D) return 'high';
  if (input.volume30d > 0) return 'normal';
  return 'skip';
}

export function dayKey(value: string): string {
  return value.slice(0, 10);
}

export function recordedAtForDay(date: string): string {
  return `${dayKey(date)}T12:00:00.000Z`;
}

export function extractHistoryPoints(payload: unknown): HistoryPoint[] {
  const fromVariants = pointsFromVariants(payload);
  if (fromVariants.length > 0) return mergeByDay(fromVariants);

  const fromArray = pointsFromUnknown(payload);
  return mergeByDay(fromArray);
}

export function volumeWindows(points: HistoryPoint[], now: Date = new Date()): VolumeWindows {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let volume7d = 0;
  let volume30d = 0;
  let volume180d = 0;
  for (const point of points) {
    const day = Date.parse(`${dayKey(point.date)}T00:00:00.000Z`);
    if (!Number.isFinite(day) || day > end) continue;
    const ageDays = Math.floor((end - day) / 86_400_000);
    if (ageDays <= 7) volume7d += point.volume;
    if (ageDays <= 30) volume30d += point.volume;
    if (ageDays <= HISTORY_DAYS) volume180d += point.volume;
  }
  return { volume7d, volume30d, volume180d };
}

function mergeByDay(points: HistoryPoint[]): HistoryPoint[] {
  const byDay = new Map<string, HistoryPoint>();
  for (const point of points) {
    if (!(point.price > 0)) continue;
    const date = dayKey(point.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const volume = Number.isFinite(point.volume) && point.volume > 0 ? point.volume : 0;
    const existing = byDay.get(date);
    if (!existing) {
      byDay.set(date, { date, price: point.price, volume });
      continue;
    }
    existing.price = point.price;
    existing.volume += volume;
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function pointsFromVariants(payload: unknown): HistoryPoint[] {
  const variants = findVariants(payload);
  if (!variants) return [];

  const preferred: HistoryPoint[] = [];
  const fallback: HistoryPoint[] = [];
  for (const printing of Object.values(variants)) {
    if (!printing || typeof printing !== 'object') continue;
    for (const [condition, body] of Object.entries(printing as Record<string, unknown>)) {
      const history = historyArrayFrom(body);
      if (history.length === 0) continue;
      if (PREFERRED_CONDITIONS.includes(condition.toLowerCase())) {
        preferred.push(...history);
      } else {
        fallback.push(...history);
      }
    }
  }
  return preferred.length > 0 ? preferred : fallback;
}

function findVariants(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const history = root.priceHistory;
  if (history && typeof history === 'object' && !Array.isArray(history)) {
    const variants = (history as Record<string, unknown>).variants;
    if (variants && typeof variants === 'object') {
      return variants as Record<string, unknown>;
    }
  }
  if (root.variants && typeof root.variants === 'object') {
    return root.variants as Record<string, unknown>;
  }
  return null;
}

function pointsFromUnknown(payload: unknown): HistoryPoint[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => historyArrayFrom(item));
  }
  if (typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.priceHistory)) return historyArrayFrom(root.priceHistory);
  if (root.priceHistory && typeof root.priceHistory === 'object') {
    return historyArrayFrom(root.priceHistory);
  }
  return historyArrayFrom(root);
}

function historyArrayFrom(value: unknown): HistoryPoint[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(asPoint).filter((p): p is HistoryPoint => p !== null);
  }
  if (typeof value === 'object' && Array.isArray((value as { history?: unknown }).history)) {
    return ((value as { history: unknown[] }).history)
      .map(asPoint)
      .filter((p): p is HistoryPoint => p !== null);
  }
  const point = asPoint(value);
  return point ? [point] : [];
}

function asPoint(value: unknown): HistoryPoint | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const dateRaw = row.date ?? row.recordedAt ?? row.recorded_at;
  const priceRaw = row.price ?? row.market ?? row.close;
  const volumeRaw = row.volume ?? row.sales ?? row.count;
  if (typeof dateRaw !== 'string' || dateRaw.length < 10) return null;
  const price = typeof priceRaw === 'number' ? priceRaw : Number(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return null;
  const volume = typeof volumeRaw === 'number' ? volumeRaw : Number(volumeRaw);
  return {
    date: dayKey(dateRaw),
    price,
    volume: Number.isFinite(volume) && volume > 0 ? volume : 0,
  };
}
