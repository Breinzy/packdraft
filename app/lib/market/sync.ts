import type { SupabaseClient } from '@supabase/supabase-js';
import { getMarketProvider } from './provider';
import { computeChangePct } from './stale';
import type { AssetPriceRef, NormalizedPrice } from './types';
import {
  DEFAULT_MIN_DAILY_REMAINING,
  DEFAULT_REQUEST_GAP_MS,
  DEFAULT_SYNC_CREDIT_BUDGET,
  DEFAULT_SYNC_TIME_BUDGET_MS,
  capTimeBudgetMs,
  shouldStopChunk,
  type ChunkBudget,
} from './chunk-limits';
import { claimJob, saveJobState } from './job-state';
import { PokemonPriceTrackerRateLimitError } from '@/lib/pricing/client';

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  visited: number;
  wrapped: boolean;
  stopReason: string | null;
  skippedJob?: boolean;
  skipReason?: string;
}

const BATCH_SIZE = 15;

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

function estimatedCredits(refs: AssetPriceRef[]): number {
  const sealed = new Set(refs.filter((r) => r.assetType === 'sealed').map((r) => r.externalId)).size;
  const cards = new Set(
    refs.filter((r) => r.assetType === 'single' || r.assetType === 'graded').map((r) => r.externalId)
  ).size;
  const ebay = refs.some((r) => r.assetType === 'graded') ? 2 : 1;
  return sealed + cards * ebay;
}

/**
 * Pull provider prices for active assets and insert Packdraft snapshots.
 * Time-boxed and cursor-based so Vercel Hobby and PPT credit windows can continue tomorrow.
 */
export async function syncMarketPrices(
  supabase: SupabaseClient,
  options: { delayMs?: number; timeBudgetMs?: number; creditBudget?: number } = {}
): Promise<SyncResult> {
  const delayMs = options.delayMs ?? DEFAULT_REQUEST_GAP_MS;
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;
  let visited = 0;
  let wrapped = false;

  let claim: Awaited<ReturnType<typeof claimJob>>;
  try {
    claim = await claimJob(supabase, 'price_sync');
  } catch (err) {
    return {
      synced: 0,
      skipped: 0,
      errors: [err instanceof Error ? err.message : String(err)],
      visited: 0,
      wrapped: false,
      stopReason: 'error',
    };
  }

  if (!claim.claimed) {
    return {
      synced: 0,
      skipped: 0,
      errors: [],
      visited: 0,
      wrapped: false,
      stopReason: claim.reason ?? 'skipped',
      skippedJob: true,
      skipReason: claim.reason,
    };
  }

  const budget: ChunkBudget = {
    startedAtMs: Date.now(),
    timeBudgetMs: capTimeBudgetMs(options.timeBudgetMs, DEFAULT_SYNC_TIME_BUDGET_MS),
    creditsUsed: 0,
    creditBudget: options.creditBudget ?? DEFAULT_SYNC_CREDIT_BUDGET,
    dailyRemaining: claim.state.daily_remaining,
    minDailyRemaining: DEFAULT_MIN_DAILY_REMAINING,
  };

  let lastAssetId = claim.state.last_asset_id;
  const provider = getMarketProvider();

  try {
    while (!shouldStopChunk(budget)) {
      let query = supabase
        .from('assets')
        .select('id, name, asset_type, external_id, metadata')
        .eq('active', true)
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);
      if (lastAssetId) query = query.gt('id', lastAssetId);

      const { data: assets, error: fetchError } = await query;
      if (fetchError) {
        errors.push(`Failed to fetch assets: ${fetchError.message}`);
        break;
      }
      if (!assets || assets.length === 0) {
        if (!lastAssetId || wrapped) break;
        lastAssetId = null;
        wrapped = true;
        continue;
      }

      const withIds = assets.filter((asset) => asset.external_id);
      skipped += assets.length - withIds.length;
      visited += assets.length;
      lastAssetId = assets[assets.length - 1].id;

      const refs: AssetPriceRef[] = withIds.map((asset) => ({
        externalId: String(asset.external_id),
        assetType: asset.asset_type as AssetPriceRef['assetType'],
      }));

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      let prices: NormalizedPrice[] = [];
      try {
        prices = await provider.fetchPrices(refs);
        budget.creditsUsed += estimatedCredits(refs);
      } catch (err) {
        if (err instanceof PokemonPriceTrackerRateLimitError) {
          errors.push(err.message);
          await finish(err.limitType === 'daily' ? 'daily_limit' : 'credits');
          return result(err.limitType === 'daily' ? 'daily_limit' : 'credits');
        }
        errors.push(`Batch fetch failed: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: oldSnapshots } = await supabase
        .from('price_snapshots')
        .select('asset_id, price')
        .in(
          'asset_id',
          withIds.map((asset) => asset.id)
        )
        .lte('recorded_at', sevenDaysAgo)
        .order('recorded_at', { ascending: false });

      const prevPrices = new Map<string, number>();
      for (const snap of oldSnapshots ?? []) {
        if (snap.asset_id && !prevPrices.has(snap.asset_id)) {
          prevPrices.set(snap.asset_id, Number(snap.price));
        }
      }

      for (const asset of withIds) {
        const grade = gradeKey(asset.metadata as Record<string, unknown> | null);
        const quote = matchingPrice(prices, String(asset.external_id), asset.asset_type, grade);

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

      await saveJobState(supabase, 'price_sync', {
        status: 'running',
        last_asset_id: lastAssetId,
        snapshots_written: claim.state.snapshots_written + synced,
        assets_visited: claim.state.assets_visited + visited,
        credits_used: claim.state.credits_used + budget.creditsUsed,
        last_run_at: new Date().toISOString(),
      });
    }

    const stop = shouldStopChunk(budget) ?? (wrapped ? 'complete' : 'time');
    await finish(stop);
    return result(stop);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    await finish('error');
    return result('error');
  }

  async function finish(stopReason: string) {
    await saveJobState(supabase, 'price_sync', {
      status: 'pending',
      last_asset_id: lastAssetId,
      snapshots_written: claim.state.snapshots_written + synced,
      assets_visited: claim.state.assets_visited + visited,
      credits_used: claim.state.credits_used + budget.creditsUsed,
      last_error: errors[0] ?? null,
      stop_reason: stopReason,
      last_run_at: new Date().toISOString(),
    });
  }

  function result(stopReason: string): SyncResult {
    return {
      synced,
      skipped,
      errors: errors.slice(0, 25),
      visited,
      wrapped,
      stopReason,
    };
  }
}
