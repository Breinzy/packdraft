import type { SupabaseClient } from '@supabase/supabase-js';
import { PokemonPriceTrackerRateLimitError } from '@/lib/pricing/client';
import {
  DEFAULT_MIN_DAILY_REMAINING,
  DEFAULT_REQUEST_GAP_MS,
  capTimeBudgetMs,
  shouldStopChunk,
  type ChunkBudget,
} from './chunk-limits';
import { HISTORY_DAYS } from './history';
import { claimJob, saveJobState } from './job-state';
import { insertMissingHistorySnapshots, upsertAssetMarketStats } from './persist';
import { getMarketProvider } from './provider';
import type { AssetPriceRef, NormalizedPrice } from './types';

export interface HistoryBackfillResult {
  visited: number;
  snapshotsWritten: number;
  statsUpdated: number;
  skipped: number;
  wrapped: boolean;
  stopReason: string | null;
  skippedJob?: boolean;
  skipReason?: string;
  errors: string[];
}

const BATCH_SIZE = 6;
const DEFAULT_HISTORY_TIME_BUDGET_MS = 240_000;
const DEFAULT_HISTORY_CREDIT_BUDGET = 2_000;

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
    if (price.externalId !== externalId || price.assetType !== assetType) return false;
    const priceGrade =
      price.metadata?.grade === null || price.metadata?.grade === undefined
        ? ''
        : String(price.metadata.grade);
    return priceGrade === grade;
  });
}

function estimatedCredits(refs: AssetPriceRef[]): number {
  const sealed = new Set(refs.filter((r) => r.assetType === 'sealed').map((r) => r.externalId)).size;
  const singles = new Set(refs.filter((r) => r.assetType === 'single').map((r) => r.externalId)).size;
  const graded = new Set(refs.filter((r) => r.assetType === 'graded').map((r) => r.externalId)).size;
  return sealed * 2 + singles * 2 + graded * 3;
}

/**
 * One-pass 6-month PPT history + volume for every active card and sealed product.
 * Starts paused. Admin must resume it. Chunked for Vercel / PPT credit windows.
 */
export async function backfillPriceHistory(
  supabase: SupabaseClient,
  options: { delayMs?: number; timeBudgetMs?: number; creditBudget?: number } = {}
): Promise<HistoryBackfillResult> {
  const delayMs = options.delayMs ?? DEFAULT_REQUEST_GAP_MS;
  const errors: string[] = [];
  let visited = 0;
  let snapshotsWritten = 0;
  let statsUpdated = 0;
  let skipped = 0;
  let wrapped = false;

  let claim: Awaited<ReturnType<typeof claimJob>>;
  try {
    claim = await claimJob(supabase, 'history_backfill');
  } catch (err) {
    return {
      visited: 0,
      snapshotsWritten: 0,
      statsUpdated: 0,
      skipped: 0,
      wrapped: false,
      stopReason: 'error',
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }

  if (!claim.claimed) {
    return {
      visited: 0,
      snapshotsWritten: 0,
      statsUpdated: 0,
      skipped: 0,
      wrapped: false,
      stopReason: claim.reason ?? 'skipped',
      skippedJob: true,
      skipReason: claim.reason,
      errors: [],
    };
  }

  const budget: ChunkBudget = {
    startedAtMs: Date.now(),
    timeBudgetMs: capTimeBudgetMs(options.timeBudgetMs, DEFAULT_HISTORY_TIME_BUDGET_MS),
    creditsUsed: 0,
    creditBudget: options.creditBudget ?? DEFAULT_HISTORY_CREDIT_BUDGET,
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
        .in('asset_type', ['sealed', 'single', 'graded'])
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);
      if (lastAssetId) query = query.gt('id', lastAssetId);

      const { data: assets, error: fetchError } = await query;
      if (fetchError) {
        errors.push(`Failed to fetch assets: ${fetchError.message}`);
        break;
      }
      if (!assets || assets.length === 0) {
        if (!lastAssetId || wrapped) {
          await finish('complete');
          return result('complete');
        }
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
        prices = await provider.fetchPrices(refs, { includeHistory: true, days: HISTORY_DAYS });
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

      for (const asset of withIds) {
        const grade = gradeKey(asset.metadata as Record<string, unknown> | null);
        const quote = matchingPrice(prices, String(asset.external_id), asset.asset_type, grade);
        if (!quote) {
          errors.push(`No price returned for ${asset.name}`);
          continue;
        }
        const points =
          quote.history && quote.history.length > 0
            ? quote.history
            : [{ date: quote.recordedAt.slice(0, 10), price: quote.price, volume: quote.volume ?? 0 }];
        try {
          snapshotsWritten += await insertMissingHistorySnapshots(supabase, asset.id, quote, points);
          await upsertAssetMarketStats(
            supabase,
            {
              id: asset.id,
              name: asset.name,
              asset_type: asset.asset_type,
              metadata: (asset.metadata as Record<string, unknown> | null) ?? {},
            },
            points
          );
          statsUpdated += 1;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }

      await saveJobState(supabase, 'history_backfill', {
        status: 'running',
        last_asset_id: lastAssetId,
        snapshots_written: claim.state.snapshots_written + snapshotsWritten,
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
    await saveJobState(supabase, 'history_backfill', {
      status: stopReason === 'complete' ? 'completed' : 'pending',
      last_asset_id: stopReason === 'complete' ? null : lastAssetId,
      snapshots_written: claim.state.snapshots_written + snapshotsWritten,
      assets_visited: claim.state.assets_visited + visited,
      credits_used: claim.state.credits_used + budget.creditsUsed,
      last_error: errors[0] ?? null,
      stop_reason: stopReason,
      completed_at: stopReason === 'complete' ? new Date().toISOString() : claim.state.completed_at,
      last_run_at: new Date().toISOString(),
    });
  }

  function result(stopReason: string): HistoryBackfillResult {
    return {
      visited,
      snapshotsWritten,
      statsUpdated,
      skipped,
      wrapped,
      stopReason,
      errors: errors.slice(0, 25),
    };
  }
}
