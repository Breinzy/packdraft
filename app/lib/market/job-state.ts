import type { SupabaseClient } from '@supabase/supabase-js';

export type MarketJob = 'catalog_import' | 'price_sync';
export type MarketJobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface MarketJobState {
  job: MarketJob;
  status: MarketJobStatus;
  stage: string;
  sealed_offset: number;
  set_index: number;
  graded_offset: number;
  last_asset_id: string | null;
  sealed_imported: number;
  singles_imported: number;
  graded_imported: number;
  snapshots_written: number;
  pages_fetched: number;
  assets_visited: number;
  credits_used: number;
  daily_remaining: number | null;
  export_sealed_done: boolean;
  export_unavailable: boolean;
  last_error: string | null;
  stop_reason: string | null;
  last_run_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

const STALE_RUNNING_MS = 6 * 60 * 1000;

export async function getJobState(
  supabase: SupabaseClient,
  job: MarketJob
): Promise<MarketJobState> {
  const { data, error } = await supabase.from('market_job_state').select('*').eq('job', job).maybeSingle();
  if (error) throw new Error(`Failed to load ${job} job state: ${error.message}`);
  if (!data) {
    throw new Error(
      `Missing ${job} row in market_job_state. Apply the 20260901120000_market_job_state migration.`
    );
  }
  return data as MarketJobState;
}

export async function saveJobState(
  supabase: SupabaseClient,
  job: MarketJob,
  patch: Partial<Omit<MarketJobState, 'job'>>
): Promise<MarketJobState> {
  const { data, error } = await supabase
    .from('market_job_state')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('job', job)
    .select('*')
    .single();
  if (error || !data) {
    throw new Error(`Failed to update ${job} job state: ${error?.message ?? 'unknown error'}`);
  }
  return data as MarketJobState;
}

export async function claimJob(
  supabase: SupabaseClient,
  job: MarketJob
): Promise<{ claimed: boolean; state: MarketJobState; reason?: string }> {
  const state = await getJobState(supabase, job);
  if (state.status === 'paused') {
    return { claimed: false, state, reason: 'paused' };
  }
  if (state.status === 'completed' && job === 'catalog_import') {
    return { claimed: false, state, reason: 'completed' };
  }
  if (state.status === 'running') {
    const updated = new Date(state.updated_at).getTime();
    if (Number.isFinite(updated) && Date.now() - updated < STALE_RUNNING_MS) {
      return { claimed: false, state, reason: 'already_running' };
    }
  }

  const claimed = await saveJobState(supabase, job, {
    status: 'running',
    last_run_at: new Date().toISOString(),
    started_at: state.started_at ?? new Date().toISOString(),
    last_error: null,
    stop_reason: null,
  });
  return { claimed: true, state: claimed };
}

export async function pauseJob(supabase: SupabaseClient, job: MarketJob): Promise<MarketJobState> {
  return saveJobState(supabase, job, { status: 'paused', stop_reason: 'paused' });
}

export async function resumeJob(supabase: SupabaseClient, job: MarketJob): Promise<MarketJobState> {
  const state = await getJobState(supabase, job);
  if (state.status === 'completed') return state;
  return saveJobState(supabase, job, { status: 'pending', stop_reason: null, last_error: null });
}
