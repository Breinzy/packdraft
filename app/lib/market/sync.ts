import type { SupabaseClient } from '@supabase/supabase-js';
import { getMarketProvider } from './provider';
import { computeChangePct } from './stale';
import type { AssetPriceRef, NormalizedPrice } from './types';

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 62_000;

function chunk<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

function gradeKey(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '';
  const grade = metadata.grade;
  return grade === null || grade === undefined ? '' : String(grade);
}

function matchingPrice(
  prices: NormalizedPrice[],
  externalId: string,
  assetType: string,
  grade: string
): NormalizedPrice | undefined {
  return prices.find((price) => {
    if (price.externalId !== externalId || price.assetType !== assetType) {
      return false;
    }
    const priceGrade =
      price.metadata?.grade === null || price.metadata?.grade === undefined
        ? ''
        : String(price.metadata.grade);
    return priceGrade === grade;
  });
}

/**
 * Pull provider prices for active assets and insert Packdraft snapshots.
 * Does not update existing snapshot rows.
 */
export async function syncMarketPrices(
  supabase: SupabaseClient,
  options: { delayMs?: number } = {}
): Promise<SyncResult> {
  const delayMs = options.delayMs ?? BATCH_DELAY_MS;
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  const { data: assets, error: fetchError } = await supabase
    .from('assets')
    .select('id, name, asset_type, external_id, metadata')
    .eq('active', true);

  if (fetchError || !assets) {
    return {
      synced: 0,
      skipped: 0,
      errors: [`Failed to fetch assets: ${fetchError?.message ?? 'unknown error'}`],
    };
  }

  const withIds = assets.filter((asset) => asset.external_id);
  skipped = assets.length - withIds.length;
  if (skipped > 0) {
    errors.push(`${skipped} assets missing external_id, skipped`);
  }

  const provider = getMarketProvider();
  const batches = chunk(withIds, BATCH_SIZE);

  for (let index = 0; index < batches.length; index++) {
    if (index > 0 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const batch = batches[index];
    const refs: AssetPriceRef[] = batch.map((asset) => ({
      externalId: String(asset.external_id),
      assetType: asset.asset_type,
    }));

    let prices: NormalizedPrice[] = [];
    try {
      prices = await provider.fetchPrices(refs);
    } catch (err) {
      errors.push(`Batch ${index} fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldSnapshots } = await supabase
      .from('price_snapshots')
      .select('asset_id, price')
      .in('asset_id', batch.map((asset) => asset.id))
      .lte('recorded_at', sevenDaysAgo)
      .order('recorded_at', { ascending: false });

    const prevPrices = new Map<string, number>();
    for (const snap of oldSnapshots ?? []) {
      if (snap.asset_id && !prevPrices.has(snap.asset_id)) {
        prevPrices.set(snap.asset_id, Number(snap.price));
      }
    }

    for (const asset of batch) {
      const grade = gradeKey(asset.metadata as Record<string, unknown> | null);
      const quote = matchingPrice(
        prices,
        String(asset.external_id),
        asset.asset_type,
        grade
      );

      if (!quote) {
        errors.push(`No price returned for ${asset.name}`);
        continue;
      }

      const prev = prevPrices.get(asset.id);
      const change7d =
        typeof quote.change7d === 'number' && quote.change7d !== 0
          ? quote.change7d
          : prev
            ? computeChangePct(quote.price, prev)
            : 0;

      const { error: insertError } = await supabase.from('price_snapshots').insert({
        asset_id: asset.id,
        product_id: null,
        price: quote.price,
        change_7d: change7d,
        volume: quote.volume ?? 0,
        source: quote.source,
        condition: quote.condition ?? null,
        price_type: quote.priceType,
        metadata: quote.metadata ?? {},
        recorded_at: quote.recordedAt,
      });

      if (insertError) {
        errors.push(`Snapshot insert failed for ${asset.name}: ${insertError.message}`);
      } else {
        synced += 1;
      }
    }
  }

  return { synced, skipped, errors };
}
