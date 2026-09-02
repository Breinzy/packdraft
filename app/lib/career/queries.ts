import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset, CareerPortfolio, CareerPosition, CareerTransaction, CareerValueSnapshot } from '@/types';
import { CAREER_STARTING_CASH } from '@/types';
import type { TransactionRow } from '@/lib/tournament/queries';

function asNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export { CAREER_STARTING_CASH };

export async function ensureCareerPortfolio(
  service: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await service.rpc('ensure_career_portfolio', { p_user_id: userId });
  if (error) throw new Error(`Failed to open career book: ${error.message}`);
  return data as string;
}

export async function getCareerPortfolio(
  supabase: SupabaseClient,
  userId: string
): Promise<CareerPortfolio | null> {
  const { data, error } = await supabase
    .from('career_portfolios')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load career book: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    starting_cash: asNumber(data.starting_cash),
    cash: asNumber(data.cash),
    created_at: data.created_at as string,
  };
}

export interface CareerHoldingRow extends CareerPosition {
  asset: Asset | null;
}

export async function getCareerHoldings(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<CareerHoldingRow[]> {
  const { data, error } = await supabase
    .from('career_positions')
    .select('*, assets (*)')
    .eq('portfolio_id', portfolioId)
    .order('average_cost', { ascending: false });
  if (error) throw new Error(`Failed to load career holdings: ${error.message}`);

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

export async function getCareerTransactions(
  supabase: SupabaseClient,
  portfolioId: string,
  limit = 50
): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('career_transactions')
    .select('*, assets ( name )')
    .eq('portfolio_id', portfolioId)
    .order('executed_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load career trades: ${error.message}`);

  return (data ?? []).map((row) => {
    const assetRaw = row.assets as { name: string } | { name: string }[] | null;
    const asset = Array.isArray(assetRaw) ? assetRaw[0] : assetRaw;
    return {
      id: row.id as string,
      portfolio_id: row.portfolio_id as string,
      asset_id: row.asset_id as string,
      side: row.side as CareerTransaction['side'],
      quantity: Number(row.quantity),
      execution_price: asNumber(row.execution_price as number),
      total_value: asNumber(row.total_value as number),
      executed_at: row.executed_at as string,
      price_snapshot_id: (row.price_snapshot_id as string | null) ?? null,
      asset_name: asset?.name ?? null,
    };
  });
}

export async function getCareerValueHistory(
  supabase: SupabaseClient,
  portfolioId: string,
  limit = 90
): Promise<CareerValueSnapshot[]> {
  const { data, error } = await supabase
    .from('career_value_snapshots')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('recorded_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Failed to load career chart: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    portfolio_id: row.portfolio_id as string,
    cash: asNumber(row.cash),
    holdings_value: asNumber(row.holdings_value),
    portfolio_value: asNumber(row.portfolio_value),
    recorded_at: row.recorded_at as string,
  }));
}
