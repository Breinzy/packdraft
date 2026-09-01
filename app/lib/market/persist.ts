import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedAsset, NormalizedPrice } from './types';

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
