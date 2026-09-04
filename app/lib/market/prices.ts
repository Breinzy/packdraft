import type { SupabaseClient } from '@supabase/supabase-js';
import { isPriceStale } from './stale';
import type { CurrentPrice } from '@/types';

export const PRICE_ID_CHUNK = 80;

interface SnapshotRow {
  id?: string;
  snapshot_id?: string;
  asset_id: string;
  price: number | string;
  recorded_at: string;
  source: string;
  price_type: string | null;
  condition: string | null;
  change_7d: number | string | null;
  volume: number | null;
}

function toCurrentPrice(row: SnapshotRow, now: Date): CurrentPrice {
  return {
    assetId: row.asset_id,
    price: Number(row.price),
    recordedAt: row.recorded_at,
    source: row.source,
    priceType: row.price_type ?? 'market',
    condition: row.condition,
    change7d: Number(row.change_7d ?? 0),
    volume: row.volume ?? 0,
    stale: isPriceStale(row.recorded_at, now),
    snapshotId: row.id ?? row.snapshot_id,
  };
}

export function chunkIds(ids: string[], size = PRICE_ID_CHUNK): string[][] {
  const unique = [...new Set(ids.filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += size) {
    chunks.push(unique.slice(i, i + size));
  }
  return chunks;
}

/**
 * Latest Packdraft snapshot at or before `at`. Never calls an external provider.
 */
export async function getPriceAt(
  supabase: SupabaseClient,
  assetId: string,
  at: Date = new Date()
): Promise<CurrentPrice | null> {
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('id, asset_id, price, recorded_at, source, price_type, condition, change_7d, volume')
    .eq('asset_id', assetId)
    .lte('recorded_at', at.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load price for asset ${assetId}: ${error.message}`);
  }
  if (!data?.asset_id) return null;
  return toCurrentPrice(data as SnapshotRow, at);
}

export async function getCurrentPrice(
  supabase: SupabaseClient,
  assetId: string,
  now: Date = new Date()
): Promise<CurrentPrice | null> {
  return getPriceAt(supabase, assetId, now);
}

export async function getCurrentPrices(
  supabase: SupabaseClient,
  assetIds: string[],
  now: Date = new Date()
): Promise<Map<string, CurrentPrice>> {
  const prices = new Map<string, CurrentPrice>();
  const chunks = chunkIds(assetIds);
  if (chunks.length === 0) return prices;

  for (const chunk of chunks) {
    const fromView = await supabase
      .from('asset_latest_prices')
      .select('snapshot_id, asset_id, price, recorded_at, source, price_type, condition, change_7d, volume')
      .in('asset_id', chunk);

    if (!fromView.error) {
      for (const row of fromView.data ?? []) {
        if (!row.asset_id || prices.has(row.asset_id)) continue;
        prices.set(row.asset_id, toCurrentPrice(row as SnapshotRow, now));
      }
      continue;
    }

    const { data, error } = await supabase
      .from('price_snapshots')
      .select('id, asset_id, price, recorded_at, source, price_type, condition, change_7d, volume')
      .in('asset_id', chunk)
      .lte('recorded_at', now.toISOString())
      .order('recorded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load prices: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (!row.asset_id || prices.has(row.asset_id)) continue;
      prices.set(row.asset_id, toCurrentPrice(row as SnapshotRow, now));
    }
  }

  return prices;
}

export async function getPricesAt(
  supabase: SupabaseClient,
  at: Date,
  assetIds?: string[]
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (assetIds && assetIds.length === 0) return prices;

  const chunks = assetIds ? chunkIds(assetIds) : [null];
  for (const chunk of chunks) {
    const { data, error } = await supabase.rpc('latest_prices_at', {
      p_at: at.toISOString(),
      p_ids: chunk,
    });
    if (error) {
      throw new Error(`Failed to load prices at timestamp: ${error.message}`);
    }
    for (const row of data ?? []) {
      if (!row.asset_id) continue;
      const price = Number(row.price);
      if (Number.isFinite(price) && price > 0) prices.set(row.asset_id as string, price);
    }
  }
  return prices;
}

export interface PriceHistoryPoint {
  price: number;
  recordedAt: string;
  snapshotId: string;
}

export async function getPriceHistory(
  supabase: SupabaseClient,
  assetId: string,
  options: { limit?: number; before?: Date } = {}
): Promise<PriceHistoryPoint[]> {
  const limit = options.limit ?? 60;
  const before = options.before ?? new Date();

  const { data, error } = await supabase
    .from('price_snapshots')
    .select('id, price, recorded_at')
    .eq('asset_id', assetId)
    .lte('recorded_at', before.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load price history for asset ${assetId}: ${error.message}`);
  }

  return (data ?? [])
    .slice()
    .reverse()
    .map((row) => ({
      snapshotId: row.id as string,
      price: Number(row.price),
      recordedAt: row.recorded_at as string,
    }));
}
