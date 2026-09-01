import type { SupabaseClient } from '@supabase/supabase-js';
import { getMarketProvider } from './provider';
import { priceForAsset, upsertAssetAndSnapshot } from './persist';

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
        credits.add(page.creditsConsumed || page.assets.length || 1);

        for (const asset of page.assets) {
          const key = `${asset.assetType}:${asset.externalId}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const result = await upsertAssetAndSnapshot(
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
      credits.add(page.creditsConsumed || Math.max(1, page.assets.length));

      if (page.assets.length === 0) break;

      for (const asset of page.assets) {
        const key = `${asset.assetType}:${asset.externalId}:${String(asset.metadata.grade ?? '')}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const result = await upsertAssetAndSnapshot(
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
