import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPlayerHistory,
  type HistoryResult,
  type HistoryTrade,
  type PlayerHistory,
} from './history';

function asNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export async function loadPlayerProfile(
  supabase: SupabaseClient,
  playerId: string,
  options: { includeTrades: boolean }
): Promise<{ displayName: string; history: PlayerHistory } | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .eq('id', playerId)
    .maybeSingle();
  if (profileError) throw new Error(`Failed to load profile: ${profileError.message}`);
  if (!profile) return null;

  const displayName =
    (profile.display_name as string | null)?.trim() ||
    String(profile.email ?? 'Player').split('@')[0] ||
    'Player';

  const { data: resultRows, error: resultError } = await supabase
    .from('tournament_results')
    .select('tournament_id, rank, return_pct, final_value, locked_at, portfolio_id, tournaments ( name, starting_budget )')
    .eq('user_id', playerId)
    .order('locked_at', { ascending: false });
  if (resultError) throw new Error(`Failed to load results: ${resultError.message}`);

  const results: HistoryResult[] = (resultRows ?? []).map((row) => {
    const tournamentRaw = row.tournaments as
      | { name: string; starting_budget: number | string }
      | { name: string; starting_budget: number | string }[]
      | null;
    const tournament = Array.isArray(tournamentRaw) ? tournamentRaw[0] : tournamentRaw;
    return {
      tournamentId: row.tournament_id as string,
      tournamentName: tournament?.name ?? 'Tournament',
      rank: Number(row.rank),
      returnPct: asNumber(row.return_pct as number),
      finalValue: asNumber(row.final_value as number),
      startingCash: asNumber(tournament?.starting_budget),
      lockedAt: row.locked_at as string,
    };
  });

  let trades: HistoryTrade[] | null = null;
  if (options.includeTrades) {
    const { data: portfolios, error: portfolioError } = await supabase
      .from('tournament_portfolios')
      .select('id')
      .eq('user_id', playerId);
    if (portfolioError) throw new Error(`Failed to load books: ${portfolioError.message}`);
    const ids = (portfolios ?? []).map((p) => p.id as string);
    if (ids.length > 0) {
      const { data: txRows, error: txError } = await supabase
        .from('tournament_transactions')
        .select('id, portfolio_id, asset_id, side, quantity, execution_price, total_value, executed_at, assets ( name )')
        .in('portfolio_id', ids)
        .order('executed_at', { ascending: true });
      if (txError) throw new Error(`Failed to load trades: ${txError.message}`);
      trades = (txRows ?? []).map((row) => {
        const assetRaw = row.assets as { name: string } | { name: string }[] | null;
        const asset = Array.isArray(assetRaw) ? assetRaw[0] : assetRaw;
        return {
          id: row.id as string,
          portfolioId: row.portfolio_id as string,
          assetId: row.asset_id as string,
          assetName: asset?.name ?? 'Asset',
          side: row.side as HistoryTrade['side'],
          quantity: Number(row.quantity),
          executionPrice: asNumber(row.execution_price as number),
          totalValue: asNumber(row.total_value as number),
          executedAt: row.executed_at as string,
        };
      });
    } else {
      trades = [];
    }
  }

  return { displayName, history: buildPlayerHistory(results, trades) };
}
