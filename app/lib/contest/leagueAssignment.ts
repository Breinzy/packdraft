import type { SupabaseClient } from '@supabase/supabase-js';
import { LEAGUE_SIZE } from '@/types';

/**
 * Find or create an open league for a given contest.
 * Called during signup — the DB trigger handles this,
 * but this is available as a utility for manual operations.
 */
export async function assignToLeague(
  supabase: SupabaseClient,
  contestId: string
): Promise<string> {
  // Try to find an open league
  const { data: openLeague } = await supabase
    .from('leagues')
    .select('id')
    .eq('contest_id', contestId)
    .eq('is_full', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (openLeague) return openLeague.id;

  // Create a new league
  const name = `League-${crypto.randomUUID().slice(0, 6)}`;
  const { data: newLeague, error } = await supabase
    .from('leagues')
    .insert({ name, contest_id: contestId })
    .select('id')
    .single();

  if (error || !newLeague) {
    throw new Error(`Failed to create league: ${error?.message}`);
  }

  return newLeague.id;
}

/**
 * Check if league is full and should be closed.
 */
export async function checkLeagueFull(
  supabase: SupabaseClient,
  leagueId: string
): Promise<boolean> {
  const { data: league } = await supabase
    .from('leagues')
    .select('player_count')
    .eq('id', leagueId)
    .single();

  return (league?.player_count ?? 0) >= LEAGUE_SIZE;
}
