import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Find or create an open league for a given contest.
 * Only allows assignment during the registration window.
 */
export async function assignToLeague(
  supabase: SupabaseClient,
  contestId: string,
  enforceRegistration = true
): Promise<string> {
  if (enforceRegistration) {
    const { data: contest } = await supabase
      .from('contests')
      .select('status, registration_opens_at, starts_at')
      .eq('id', contestId)
      .single();

    if (!contest) {
      throw new Error('Contest not found');
    }

    const now = new Date();
    const regOpens = contest.registration_opens_at
      ? new Date(contest.registration_opens_at)
      : null;
    const startsAt = new Date(contest.starts_at);

    const isRegistrationOpen =
      contest.status === 'registration' ||
      (regOpens && now >= regOpens && now < startsAt);

    if (!isRegistrationOpen) {
      throw new Error('Registration is not currently open for this contest');
    }
  }

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

export async function checkLeagueFull(
  supabase: SupabaseClient,
  leagueId: string
): Promise<boolean> {
  const { data: league } = await supabase
    .from('leagues')
    .select('player_count, max_players')
    .eq('id', leagueId)
    .single();

  return (league?.player_count ?? 0) >= (league?.max_players ?? 20);
}
