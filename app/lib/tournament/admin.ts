import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssetType } from '@/types';

export interface CreateTournamentInput {
  name: string;
  description?: string;
  startingBudget?: number;
  durationDays?: number;
  startsAt?: string;
  createdBy?: string | null;
  tcgSlug?: string;
  eligibleAssetTypes?: AssetType[];
}

export async function createTournament(
  service: SupabaseClient,
  input: CreateTournamentInput
): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new Error('Tournament name is required');

  const startingBudget = input.startingBudget ?? 10000;
  if (!(startingBudget > 0)) throw new Error('Starting budget must be positive');

  const durationDays = input.durationDays ?? 7;
  if (!(durationDays > 0)) throw new Error('Duration must be positive');

  const { data: tcg, error: tcgError } = await service
    .from('tcgs')
    .select('id')
    .eq('slug', input.tcgSlug ?? 'pokemon')
    .maybeSingle();
  if (tcgError) throw new Error(`Failed to load TCG: ${tcgError.message}`);
  if (!tcg) throw new Error('Pokémon TCG is not seeded. Apply the Phase 2 migration first.');

  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) throw new Error('Invalid start time');
  const tradingClosesAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { data, error } = await service
    .from('tournaments')
    .insert({
      name,
      description: input.description?.trim() ?? '',
      tcg_id: tcg.id,
      starting_budget: startingBudget,
      starts_at: startsAt.toISOString(),
      trading_closes_at: tradingClosesAt.toISOString(),
      ends_at: tradingClosesAt.toISOString(),
      status: startsAt.getTime() <= Date.now() ? 'active' : 'upcoming',
      created_by: input.createdBy ?? null,
      eligible_asset_types: input.eligibleAssetTypes ?? ['sealed', 'graded', 'single'],
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create tournament: ${error?.message ?? 'unknown error'}`);
  }
  return { id: data.id as string };
}
