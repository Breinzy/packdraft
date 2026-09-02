import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedAsset, NormalizedPrice } from './types';
import {
  dailyUpdateTier,
  dayKey,
  recordedAtForDay,
  sealedSubtypeFromAsset,
  volumeWindows,
  type HistoryPoint,
} from './history';
import { computeChangePct } from './stale';

export async function upsertAssetAndSnapshot(
  supabase: SupabaseClient,
  asset: NormalizedAsset,
  price: NormalizedPrice | undefined
): Promise<{ ok: boolean; error?: string; wroteSnapshot: boolean }> {
  const { data: assetId, error: rpcError } = await supabase.rpc('upsert_asset', {
    p_tcg_slug: asset.tcgSlug,
    p_set_name: asset.setName,
    p_name: asset.name,
    p_asset_type: asset.assetType,
    p_external_id: asset.externalId,
    p_image_url: asset.imageUrl ?? null,
    p_metadata: asset.metadata,
    p_active: true,
  });

  if (rpcError) {
    return { ok: false, error: `Upsert failed for "${asset.name}": ${rpcError.message}`, wroteSnapshot: false };
  }

  if (!assetId) {
    return { ok: false, error: `Upsert returned no ID for "${asset.name}"`, wroteSnapshot: false };
  }

  if (!price) {
    return { ok: true, wroteSnapshot: false };
  }

  const { error: snapError } = await supabase.from('price_snapshots').insert({
    asset_id: assetId,
    product_id: null,
    price: price.price,
    change_7d: price.change7d ?? 0,
    volume: price.volume ?? 0,
    source: price.source,
    condition: price.condition ?? null,
    price_type: price.priceType,
    metadata: price.metadata ?? {},
    recorded_at: price.recordedAt,
  });

  if (snapError) {
    return { ok: true, error: `Snapshot failed for "${asset.name}": ${snapError.message}`, wroteSnapshot: false };
  }

  return { ok: true, wroteSnapshot: true };
}

export function priceForAsset(
  asset: NormalizedAsset,
  prices: NormalizedPrice[]
): NormalizedPrice | undefined {
  const grade =
    asset.metadata.grade === null || asset.metadata.grade === undefined
      ? ''
      : String(asset.metadata.grade);

  return prices.find((price) => {
    if (price.externalId !== asset.externalId || price.assetType !== asset.assetType) {
      return false;
    }
    const priceGrade =
      price.metadata?.grade === null || price.metadata?.grade === undefined
        ? ''
        : String(price.metadata.grade);
    return priceGrade === grade;
  });
}

export async function insertMissingHistorySnapshots(
  supabase: SupabaseClient,
  assetId: string,
  quote: NormalizedPrice,
  points: HistoryPoint[]
): Promise<number> {
  if (points.length === 0) return 0;

  const first = recordedAtForDay(points[0].date);
  const last = recordedAtForDay(points[points.length - 1].date);
  const { data: existing, error } = await supabase
    .from('price_snapshots')
    .select('recorded_at')
    .eq('asset_id', assetId)
    .gte('recorded_at', first)
    .lte('recorded_at', last);

  if (error) {
    throw new Error(`Failed to load existing snapshots for ${assetId}: ${error.message}`);
  }

  const have = new Set((existing ?? []).map((row) => dayKey(String(row.recorded_at))));
  const rows = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (have.has(point.date)) continue;
    const prev = points[Math.max(0, i - 7)];
    rows.push({
      asset_id: assetId,
      product_id: null,
      price: point.price,
      change_7d: prev && prev.date !== point.date ? computeChangePct(point.price, prev.price) : 0,
      volume: point.volume,
      source: quote.source,
      condition: quote.condition ?? null,
      price_type: quote.priceType,
      metadata: quote.metadata ?? {},
      recorded_at: recordedAtForDay(point.date),
    });
  }

  if (rows.length === 0) return 0;

  const { error: insertError } = await supabase.from('price_snapshots').insert(rows);
  if (insertError) {
    throw new Error(`History snapshot insert failed: ${insertError.message}`);
  }
  return rows.length;
}

export async function upsertAssetMarketStats(
  supabase: SupabaseClient,
  asset: {
    id: string;
    name: string;
    asset_type: string;
    metadata: Record<string, unknown> | null;
  },
  points: HistoryPoint[],
  now: Date = new Date()
): Promise<void> {
  const windows = volumeWindows(points, now);
  const latest = points[points.length - 1];
  const subtype = sealedSubtypeFromAsset(asset.asset_type, asset.name, asset.metadata);
  const alwaysDaily = asset.asset_type === 'sealed' && (subtype === 'etb' || subtype === 'booster_box');
  const { error } = await supabase.from('asset_market_stats').upsert({
    asset_id: asset.id,
    volume_7d: windows.volume7d,
    volume_30d: windows.volume30d,
    volume_180d: windows.volume180d,
    history_points: points.length,
    last_price: latest?.price ?? null,
    last_volume: latest?.volume ?? 0,
    last_point_date: latest?.date ?? null,
    daily_tier: dailyUpdateTier({
      assetType: asset.asset_type,
      sealedSubtype: subtype,
      volume30d: windows.volume30d,
    }),
    always_daily: alwaysDaily,
    history_synced_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
  if (error) {
    throw new Error(`Failed to upsert market stats for ${asset.name}: ${error.message}`);
  }
}
