import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Asset,
  Tournament,
  TournamentPortfolio,
  TournamentPosition,
  TournamentStanding,
  TournamentTransaction,
} from '@/types';
import { tickStatus } from './lifecycle';

function asNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export function mapTournament(row: Record<string, unknown>): Tournament {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    tcg_id: row.tcg_id as string,
    starting_budget: asNumber(row.starting_budget as number),
    starts_at: row.starts_at as string,
    trading_closes_at: row.trading_closes_at as string,
    ends_at: row.ends_at as string,
    status: tickStatus(
      row.status as Tournament['status'],
      row.starts_at as string,
      row.trading_closes_at as string
    ),
    rules: (row.rules as Record<string, unknown>) ?? {},
    prize_info: (row.prize_info as Record<string, unknown>) ?? {},
    eligible_asset_types: (row.eligible_asset_types as Tournament['eligible_asset_types']) ?? [
      'sealed',
      'graded',
      'single',
    ],
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    settled_at: (row.settled_at as string | null) ?? null,
    visibility: (row.visibility as Tournament['visibility']) === 'private' ? 'private' : 'public',
    invite_code: (row.invite_code as string | null) ?? null,
    host_kind: (row.host_kind as Tournament['host_kind']) === 'creator' ? 'creator' : 'admin',
    sponsor_name: (row.sponsor_name as string) ?? '',
    sponsor_url: (row.sponsor_url as string) ?? '',
    entry_mode: 'free',
    qualifier_tournament_id: (row.qualifier_tournament_id as string | null) ?? null,
    qualifier_max_rank: Number(row.qualifier_max_rank ?? 3) || 3,
  };
}

export async function listTournaments(supabase: SupabaseClient): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('starts_at', { ascending: false });
  if (error) throw new Error(`Failed to load tournaments: ${error.message}`);
  return (data ?? []).map((row) => mapTournament(row as Record<string, unknown>));
}

export async function getTournament(
  supabase: SupabaseClient,
  id: string
): Promise<Tournament | null> {
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load tournament: ${error.message}`);
  if (!data) return null;
  return mapTournament(data as Record<string, unknown>);
}

/** RLS hides private books. Invite visitors are loaded via service role only when the code matches. */
export async function getVisibleTournament(
  userClient: SupabaseClient,
  service: SupabaseClient | null,
  id: string,
  invite: string | null
): Promise<Tournament | null> {
  const viaUser = await getTournament(userClient, id);
  if (viaUser) return viaUser;
  if (!service || !invite) return null;
  const viaService = await getTournament(service, id);
  if (!viaService) return null;
  if (viaService.visibility !== 'private') return null;
  if (!viaService.invite_code || viaService.invite_code !== invite) return null;
  return viaService;
}

export async function getUserPortfolio(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string
): Promise<TournamentPortfolio | null> {
  const { data, error } = await supabase
    .from('tournament_portfolios')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load portfolio: ${error.message}`);
  if (!data) return null;
  return {
    ...data,
    starting_cash: asNumber(data.starting_cash),
    cash: asNumber(data.cash),
  } as TournamentPortfolio;
}

export async function getUserActiveBooks(
  supabase: SupabaseClient,
  userId: string
): Promise<{ tournament: Tournament; portfolio: TournamentPortfolio }[]> {
  const { data, error } = await supabase
    .from('tournament_portfolios')
    .select('*, tournaments (*)')
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to load books: ${error.message}`);

  const rows: { tournament: Tournament; portfolio: TournamentPortfolio }[] = [];
  for (const row of data ?? []) {
    const t = row.tournaments as Record<string, unknown> | Record<string, unknown>[] | null;
    const tournamentRow = Array.isArray(t) ? t[0] : t;
    if (!tournamentRow) continue;
    const tournament = mapTournament(tournamentRow);
    rows.push({
      tournament,
      portfolio: {
        id: row.id as string,
        tournament_id: row.tournament_id as string,
        user_id: row.user_id as string,
        starting_cash: asNumber(row.starting_cash as number),
        cash: asNumber(row.cash as number),
        created_at: row.created_at as string,
      },
    });
  }
  return rows;
}

export interface HoldingRow extends TournamentPosition {
  asset: Asset | null;
}

export async function getHoldings(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<HoldingRow[]> {
  const { data, error } = await supabase
    .from('tournament_positions')
    .select('*, assets (*)')
    .eq('portfolio_id', portfolioId)
    .order('average_cost', { ascending: false });
  if (error) throw new Error(`Failed to load holdings: ${error.message}`);

  return (data ?? []).map((row) => {
    const assetRaw = row.assets as Asset | Asset[] | null;
    const asset = Array.isArray(assetRaw) ? (assetRaw[0] ?? null) : assetRaw;
    return {
      id: row.id as string,
      portfolio_id: row.portfolio_id as string,
      asset_id: row.asset_id as string,
      quantity: Number(row.quantity),
      average_cost: asNumber(row.average_cost as number),
      asset,
    };
  });
}

export interface TransactionRow extends TournamentTransaction {
  asset_name: string | null;
}

export async function getTransactions(
  supabase: SupabaseClient,
  portfolioId: string,
  limit = 50
): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('tournament_transactions')
    .select('*, assets ( name )')
    .eq('portfolio_id', portfolioId)
    .order('executed_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load trades: ${error.message}`);

  return (data ?? []).map((row) => {
    const assetRaw = row.assets as { name: string } | { name: string }[] | null;
    const asset = Array.isArray(assetRaw) ? assetRaw[0] : assetRaw;
    return {
      id: row.id as string,
      portfolio_id: row.portfolio_id as string,
      asset_id: row.asset_id as string,
      side: row.side as TournamentTransaction['side'],
      quantity: Number(row.quantity),
      execution_price: asNumber(row.execution_price as number),
      total_value: asNumber(row.total_value as number),
      executed_at: row.executed_at as string,
      price_snapshot_id: (row.price_snapshot_id as string | null) ?? null,
      asset_name: asset?.name ?? null,
    };
  });
}

export async function getStandings(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<TournamentStanding[]> {
  const { data, error } = await supabase.rpc('get_tournament_standings', {
    p_tournament_id: tournamentId,
  });
  if (error) throw new Error(`Failed to load standings: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    user_id: row.user_id as string,
    display_name: (row.display_name as string) ?? 'Player',
    cash: asNumber(row.cash as number),
    holdings_value: asNumber(row.holdings_value as number),
    portfolio_value: asNumber(row.portfolio_value as number),
    return_pct: asNumber(row.return_pct as number),
    rank: Number(row.rank),
    frozen: Boolean(row.frozen),
    joined_at: row.joined_at as string,
  }));
}

export async function tickTournaments(service: SupabaseClient): Promise<unknown> {
  const { data, error } = await service.rpc('tick_tournaments');
  if (error) throw new Error(`Failed to tick tournaments: ${error.message}`);
  return data;
}
