export type ChunkStopReason =
  | 'time'
  | 'credits'
  | 'daily_limit'
  | 'complete'
  | 'paused'
  | 'error';

export interface ChunkBudget {
  startedAtMs: number;
  timeBudgetMs: number;
  creditsUsed: number;
  creditBudget: number;
  dailyRemaining: number | null;
  minDailyRemaining: number;
}

export const DEFAULT_IMPORT_TIME_BUDGET_MS = 240_000;
export const DEFAULT_SYNC_TIME_BUDGET_MS = 240_000;
export const DEFAULT_IMPORT_CREDIT_BUDGET = 2_500;
export const DEFAULT_SYNC_CREDIT_BUDGET = 2_000;
export const DEFAULT_MIN_DAILY_REMAINING = 25;
export const DEFAULT_REQUEST_GAP_MS = 1_100;
export const STALE_RUNNING_MS = 6 * 60 * 1000;
export const VERCEL_MAX_DURATION_MS = 300_000;

export function importCreditBudgetFromEnv(): number {
  const raw = process.env.PACKDRAFT_IMPORT_CREDIT_BUDGET;
  const n = raw ? Number(raw) : DEFAULT_IMPORT_CREDIT_BUDGET;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_IMPORT_CREDIT_BUDGET;
}

export function remainingTimeMs(budget: Pick<ChunkBudget, 'startedAtMs' | 'timeBudgetMs'>): number {
  return budget.timeBudgetMs - (Date.now() - budget.startedAtMs);
}

export function shouldStopChunk(budget: ChunkBudget): ChunkStopReason | null {
  if (Date.now() - budget.startedAtMs >= budget.timeBudgetMs) return 'time';
  if (budget.creditsUsed >= budget.creditBudget) return 'credits';
  if (budget.dailyRemaining !== null && budget.dailyRemaining <= budget.minDailyRemaining) {
    return 'daily_limit';
  }
  return null;
}

export function capTimeBudgetMs(requested: number | undefined, fallback: number): number {
  const value = requested && Number.isFinite(requested) && requested > 0 ? requested : fallback;
  // Leave ~45s for the process to flush state before Vercel kills a 300s lambda.
  return Math.min(value, VERCEL_MAX_DURATION_MS - 45_000);
}
