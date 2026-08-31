import type { SupabaseClient } from '@supabase/supabase-js';
import { getMarketProvider } from './provider';
import type { NormalizedAsset, NormalizedPrice } from './types';

export interface ImportOptions {
  maxSealedPages?: number;
  maxGradedCards?: number;
  creditBudget?: number;
  throttleMs?: number;
}

export interface ImportResult {
  sealedImported: number;
  gradedImported: number;
  snapshotsWritten: number;
  errors: string[];
  stoppedEarly: boolean;
}

const DEFAULT_OPTIONS: Required<ImportOptions> = {
  maxSealedPages: 30,
  maxGradedCards: 200,
  creditBudget: 5000,
  throttleMs: 31_000,
};

const SEALED_SEARCH_TERMS = [
  'Booster Box',
  'Elite Trainer Box',
  'Booster Bundle',
  'Ultra Premium Collection',
  'Premium Collection',
];

class CreditTracker {
  used = 0;
  constructor(private budget: number) {}
  add(count: number) {
    this.used += count;
  }
  exceeded() {
    return this.used >= this.budget;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertAndSnapshot(
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

function priceForAsset(
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

export async function importMarketCatalog(
  supabase: SupabaseClient,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const credits = new CreditTracker(opts.creditBudget);
  const provider = getMarketProvider();
  const errors: string[] = [];
  let sealedImported = 0;
  let gradedImported = 0;
  let snapshotsWritten = 0;
  const seen = new Set<string>();

  for (const searchTerm of SEALED_SEARCH_TERMS) {
    if (credits.exceeded()) break;
    let offset = 0;
    let pages = 0;

    while (pages < opts.maxSealedPages) {
      if (credits.exceeded()) break;
      await sleep(opts.throttleMs);

      try {
        const page = await provider.fetchSealedPage({
          search: searchTerm,
          limit: 20,
          offset,
        });
        credits.add(page.assets.length || 1);

        for (const asset of page.assets) {
          const key = `${asset.assetType}:${asset.externalId}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const result = await upsertAndSnapshot(
            supabase,
            asset,
            priceForAsset(asset, page.prices)
          );
          if (result.error) errors.push(result.error);
          if (result.ok) sealedImported += 1;
          if (result.wroteSnapshot) snapshotsWritten += 1;
        }

        offset += 20;
        pages += 1;
        if (offset >= page.total || page.assets.length === 0) break;
      } catch (err) {
        errors.push(`Sealed fetch "${searchTerm}" at ${offset} failed: ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }
  }

  const pageSize = 25;
  for (let offset = 0; offset < opts.maxGradedCards; offset += pageSize) {
    if (credits.exceeded()) {
      errors.push(`Credit budget reached (${credits.used}/${opts.creditBudget}), stopped card fetch`);
      break;
    }
    await sleep(opts.throttleMs);

    try {
      const batchSize = Math.min(pageSize, opts.maxGradedCards - offset);
      const page = await provider.fetchGradedPage({ limit: batchSize, offset });
      credits.add(Math.max(1, page.assets.length));

      if (page.assets.length === 0) break;

      for (const asset of page.assets) {
        const key = `${asset.assetType}:${asset.externalId}:${String(asset.metadata.grade ?? '')}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const result = await upsertAndSnapshot(
          supabase,
          asset,
          priceForAsset(asset, page.prices)
        );
        if (result.error) errors.push(result.error);
        if (result.ok) gradedImported += 1;
        if (result.wroteSnapshot) snapshotsWritten += 1;
      }
    } catch (err) {
      errors.push(`Graded fetch at ${offset} failed: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }
  }

  return {
    sealedImported,
    gradedImported,
    snapshotsWritten,
    errors,
    stoppedEarly: credits.exceeded(),
  };
}
