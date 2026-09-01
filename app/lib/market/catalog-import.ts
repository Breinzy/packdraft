import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PokemonPriceTrackerRateLimitError,
  tryDownloadExport,
  type SealedProduct,
} from '@/lib/pricing/client';
import {
  DEFAULT_IMPORT_CREDIT_BUDGET,
  DEFAULT_IMPORT_TIME_BUDGET_MS,
  DEFAULT_MIN_DAILY_REMAINING,
  DEFAULT_REQUEST_GAP_MS,
  capTimeBudgetMs,
  importCreditBudgetFromEnv,
  shouldStopChunk,
  type ChunkBudget,
  type ChunkStopReason,
} from './chunk-limits';
import { csvNumber, parseCsv } from './csv';
import { claimJob, saveJobState, type MarketJobState } from './job-state';
import { priceForAsset, upsertAssetAndSnapshot } from './persist';
import { getMarketProvider } from './provider';
import { normalizeSealedProduct } from './normalize';
import type { NormalizedAsset, NormalizedPrice, NormalizedSet } from './types';

export interface CatalogImportOptions {
  timeBudgetMs?: number;
  creditBudget?: number;
  minDailyRemaining?: number;
  requestGapMs?: number;
}

export interface CatalogImportChunkResult {
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  stage: string;
  sealedImported: number;
  singlesImported: number;
  gradedImported: number;
  snapshotsWritten: number;
  pagesFetched: number;
  creditsUsed: number;
  dailyRemaining: number | null;
  stopReason: ChunkStopReason | string | null;
  errors: string[];
  completed: boolean;
}

const SEALED_PAGE_SIZE = 50;
const SINGLES_SET_PAGE_FALLBACK = 100;
const GRADED_PAGE_SIZE = 50;
const SOURCE = 'pokemonpricetracker' as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyResult(state: MarketJobState, extra: Partial<CatalogImportChunkResult> = {}): CatalogImportChunkResult {
  return {
    ok: true,
    stage: state.stage,
    sealedImported: 0,
    singlesImported: 0,
    gradedImported: 0,
    snapshotsWritten: 0,
    pagesFetched: 0,
    creditsUsed: 0,
    dailyRemaining: state.daily_remaining,
    stopReason: state.stop_reason,
    errors: [],
    completed: state.status === 'completed',
    ...extra,
  };
}

async function persistPriced(
  supabase: SupabaseClient,
  asset: NormalizedAsset,
  prices: NormalizedPrice[],
  errors: string[]
): Promise<{ imported: boolean; wroteSnapshot: boolean }> {
  const price = priceForAsset(asset, prices);
  if (!price) return { imported: false, wroteSnapshot: false };
  const result = await upsertAssetAndSnapshot(supabase, asset, price);
  if (result.error) errors.push(result.error);
  return { imported: result.ok, wroteSnapshot: result.wroteSnapshot };
}

function applyCredits(budget: ChunkBudget, consumed: number, dailyRemaining: number | null) {
  budget.creditsUsed += Math.max(0, consumed);
  if (dailyRemaining !== null) budget.dailyRemaining = dailyRemaining;
}

/**
 * One time-boxed slice of the full PokemonPriceTracker catalog import.
 * Safe for Vercel Hobby (maxDuration 300) and PPT daily/minute credit caps.
 */
export async function runCatalogImportChunk(
  supabase: SupabaseClient,
  options: CatalogImportOptions = {}
): Promise<CatalogImportChunkResult> {
  const claim = await claimJob(supabase, 'catalog_import');
  if (!claim.claimed) {
    return emptyResult(claim.state, {
      skipped: true,
      skipReason: claim.reason,
      ok: true,
    });
  }

  let state = claim.state;
  const errors: string[] = [];
  const budget: ChunkBudget = {
    startedAtMs: Date.now(),
    timeBudgetMs: capTimeBudgetMs(options.timeBudgetMs, DEFAULT_IMPORT_TIME_BUDGET_MS),
    creditsUsed: 0,
    creditBudget: options.creditBudget ?? importCreditBudgetFromEnv() ?? DEFAULT_IMPORT_CREDIT_BUDGET,
    dailyRemaining: state.daily_remaining,
    minDailyRemaining: options.minDailyRemaining ?? DEFAULT_MIN_DAILY_REMAINING,
  };
  const requestGapMs = options.requestGapMs ?? DEFAULT_REQUEST_GAP_MS;
  const provider = getMarketProvider();
  let setsCache: NormalizedSet[] | null = null;

  let sealedImported = 0;
  let singlesImported = 0;
  let gradedImported = 0;
  let snapshotsWritten = 0;
  let pagesFetched = 0;
  let lastRequestAt = 0;

  async function throttle() {
    const wait = requestGapMs - (Date.now() - lastRequestAt);
    if (lastRequestAt > 0 && wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  }

  async function flush(stopReason: ChunkStopReason | string, status?: MarketJobState['status']) {
    const completed = stopReason === 'complete';
    state = await saveJobState(supabase, 'catalog_import', {
      status: status ?? (completed ? 'completed' : 'pending'),
      stage: completed ? 'completed' : state.stage,
      sealed_offset: state.sealed_offset,
      set_index: state.set_index,
      graded_offset: state.graded_offset,
      sealed_imported: state.sealed_imported + sealedImported,
      singles_imported: state.singles_imported + singlesImported,
      graded_imported: state.graded_imported + gradedImported,
      snapshots_written: state.snapshots_written + snapshotsWritten,
      pages_fetched: state.pages_fetched + pagesFetched,
      credits_used: state.credits_used + budget.creditsUsed,
      daily_remaining: budget.dailyRemaining,
      export_sealed_done: state.export_sealed_done,
      export_unavailable: state.export_unavailable,
      last_error: errors[0] ?? null,
      stop_reason: stopReason,
      completed_at: completed ? new Date().toISOString() : state.completed_at,
      last_run_at: new Date().toISOString(),
    });
  }

  async function heartbeat() {
    await saveJobState(supabase, 'catalog_import', {
      status: 'running',
      stage: state.stage,
      sealed_offset: state.sealed_offset,
      set_index: state.set_index,
      graded_offset: state.graded_offset,
      sealed_imported: state.sealed_imported + sealedImported,
      singles_imported: state.singles_imported + singlesImported,
      graded_imported: state.graded_imported + gradedImported,
      snapshots_written: state.snapshots_written + snapshotsWritten,
      pages_fetched: state.pages_fetched + pagesFetched,
      credits_used: state.credits_used + budget.creditsUsed,
      daily_remaining: budget.dailyRemaining,
      export_sealed_done: state.export_sealed_done,
      export_unavailable: state.export_unavailable,
      last_run_at: new Date().toISOString(),
    });
  }

  try {
    if (state.stage === 'sealed' && !state.export_sealed_done && !state.export_unavailable) {
      const exported = await ingestSealedExport(supabase, errors);
      pagesFetched += 1;
      if (exported.kind === 'ingested') {
        sealedImported += exported.imported;
        snapshotsWritten += exported.snapshots;
        state.export_sealed_done = true;
        state.stage = 'singles';
        state.sealed_offset = 0;
      } else if (exported.kind === 'unavailable') {
        state.export_unavailable = true;
      } else if (exported.kind === 'not_ready' || exported.kind === 'quota') {
        await flush(exported.kind === 'quota' ? 'daily_limit' : 'time');
        return summarize();
      }
      await heartbeat();
    }

    while (!shouldStopChunk(budget)) {
      if (state.stage === 'sealed') {
        await throttle();
        const page = await provider.fetchSealedPage({
          minPrice: 0.01,
          limit: SEALED_PAGE_SIZE,
          offset: state.sealed_offset,
        });
        pagesFetched += 1;
        applyCredits(budget, page.creditsConsumed, page.dailyRemaining);

        const seen = new Set<string>();
        for (const asset of page.assets) {
          if (asset.assetType !== 'sealed') continue;
          const key = asset.externalId;
          if (seen.has(key)) continue;
          seen.add(key);
          const result = await persistPriced(supabase, asset, page.prices, errors);
          if (result.imported) sealedImported += 1;
          if (result.wroteSnapshot) snapshotsWritten += 1;
        }

        state.sealed_offset += SEALED_PAGE_SIZE;
        if (page.assets.length === 0 || state.sealed_offset >= page.total) {
          state.stage = 'singles';
          state.set_index = 0;
        }
        await heartbeat();
        continue;
      }

      if (state.stage === 'singles') {
        if (!setsCache) {
          await throttle();
          setsCache = await loadSets(provider);
          pagesFetched += 1;
        }

        if (setsCache.length === 0) {
          await throttle();
          const page = await provider.fetchCardsPage({
            limit: SINGLES_SET_PAGE_FALLBACK,
            offset: state.set_index,
            includeEbay: false,
          });
          pagesFetched += 1;
          applyCredits(budget, page.creditsConsumed, page.dailyRemaining);
          const counts = await persistType(supabase, page, 'single', errors);
          singlesImported += counts.imported;
          snapshotsWritten += counts.snapshots;
          state.set_index += SINGLES_SET_PAGE_FALLBACK;
          if (page.assets.length === 0 || state.set_index >= page.total) {
            state.stage = 'graded';
            state.graded_offset = 0;
          }
          await heartbeat();
          continue;
        }

        if (state.set_index >= setsCache.length) {
          state.stage = 'graded';
          state.graded_offset = 0;
          await heartbeat();
          continue;
        }

        const set = setsCache[state.set_index];
        if (!set.providerSetKey || set.hasPriceGuide === false || (set.cardCount ?? 1) === 0) {
          state.set_index += 1;
          continue;
        }

        await throttle();
        const page = await provider.fetchCardsPage({
          setId: set.providerSetKey,
          fetchAllInSet: true,
          includeEbay: false,
        });
        pagesFetched += 1;
        applyCredits(budget, page.creditsConsumed, page.dailyRemaining);
        const counts = await persistType(supabase, page, 'single', errors);
        singlesImported += counts.imported;
        snapshotsWritten += counts.snapshots;
        state.set_index += 1;
        await heartbeat();
        continue;
      }

      if (state.stage === 'graded') {
        await throttle();
        const page = await provider.fetchCardsPage({
          limit: GRADED_PAGE_SIZE,
          offset: state.graded_offset,
          includeEbay: true,
        });
        pagesFetched += 1;
        applyCredits(budget, page.creditsConsumed, page.dailyRemaining);
        const counts = await persistType(supabase, page, 'graded', errors);
        gradedImported += counts.imported;
        snapshotsWritten += counts.snapshots;
        state.graded_offset += GRADED_PAGE_SIZE;
        if (page.assets.length === 0 || (page.total > 0 && state.graded_offset >= page.total)) {
          await flush('complete', 'completed');
          return summarize('complete');
        }
        await heartbeat();
        continue;
      }

      await flush('complete', 'completed');
      return summarize('complete');
    }

    const stop = shouldStopChunk(budget) ?? 'time';
    await flush(stop);
    return summarize(stop);
  } catch (err) {
    if (err instanceof PokemonPriceTrackerRateLimitError) {
      const reason: ChunkStopReason = err.limitType === 'daily' ? 'daily_limit' : 'credits';
      errors.push(err.message);
      await flush(reason);
      return summarize(reason);
    }
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    await saveJobState(supabase, 'catalog_import', {
      status: 'pending',
      last_error: message,
      stop_reason: 'error',
      daily_remaining: budget.dailyRemaining,
      last_run_at: new Date().toISOString(),
    });
    return summarize('error');
  }

  function summarize(stopReason: ChunkStopReason | string | null = state.stop_reason): CatalogImportChunkResult {
    return {
      ok: stopReason !== 'error',
      stage: state.stage,
      sealedImported,
      singlesImported,
      gradedImported,
      snapshotsWritten,
      pagesFetched,
      creditsUsed: budget.creditsUsed,
      dailyRemaining: budget.dailyRemaining,
      stopReason,
      errors: errors.slice(0, 25),
      completed: state.status === 'completed' || stopReason === 'complete',
    };
  }
}

async function persistType(
  supabase: SupabaseClient,
  page: { assets: NormalizedAsset[]; prices: NormalizedPrice[] },
  assetType: 'single' | 'graded',
  errors: string[]
): Promise<{ imported: number; snapshots: number }> {
  let imported = 0;
  let snapshots = 0;
  const seen = new Set<string>();
  for (const asset of page.assets) {
    if (asset.assetType !== assetType) continue;
    const key = `${asset.assetType}:${asset.externalId}:${String(asset.metadata.grade ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = await persistPriced(supabase, asset, page.prices, errors);
    if (result.imported) imported += 1;
    if (result.wroteSnapshot) snapshots += 1;
  }
  return { imported, snapshots };
}

async function loadSets(provider: ReturnType<typeof getMarketProvider>): Promise<NormalizedSet[]> {
  try {
    const sets = await provider.fetchSets();
    return [...sets].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

type SealedExportOutcome =
  | { kind: 'ingested'; imported: number; snapshots: number }
  | { kind: 'unavailable' }
  | { kind: 'not_ready' }
  | { kind: 'quota' };

async function ingestSealedExport(
  supabase: SupabaseClient,
  errors: string[]
): Promise<SealedExportOutcome> {
  const result = await tryDownloadExport('sealed');
  if (!result.ok) {
    if (result.status === 403) return { kind: 'unavailable' };
    if (result.status === 503) return { kind: 'not_ready' };
    if (result.status === 429) return { kind: 'quota' };
    errors.push(`Sealed export failed (${result.status}): ${result.message}`);
    return { kind: 'unavailable' };
  }

  const rows = parseCsv(result.csv);
  const recordedAt = new Date().toISOString();
  let imported = 0;
  let snapshots = 0;

  for (const row of rows) {
    const language = (row.language ?? 'english').trim().toLowerCase();
    if (language && language !== 'english') continue;
    const product = sealedProductFromCsv(row);
    if (!product) continue;
    const normalized = normalizeSealedProduct(product, SOURCE, recordedAt);
    if (!normalized?.price) continue;
    const persisted = await upsertAssetAndSnapshot(supabase, normalized.asset, normalized.price);
    if (persisted.error) errors.push(persisted.error);
    if (persisted.ok) imported += 1;
    if (persisted.wroteSnapshot) snapshots += 1;
  }

  return { kind: 'ingested', imported, snapshots };
}

export function sealedProductFromCsv(row: Record<string, string>): SealedProduct | null {
  const id = csvNumber(row.tcgPlayerId);
  if (!id) return null;
  const market = csvNumber(row.marketPrice);
  const name = (row.name ?? '').trim();
  if (!name) return null;
  return {
    tcgPlayerId: id,
    name,
    setName: (row.setName ?? '').trim() || 'Unknown',
    setId: row.setId,
    unopenedPrice: market ?? undefined,
    prices: market ? { market, low: csvNumber(row.lowPrice) ?? undefined } : undefined,
  };
}
