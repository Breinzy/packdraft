import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the UTC offset in hours for America/New_York at the given date.
 * Returns 5 for EST (winter) and 4 for EDT (summer).
 */
function getNYOffsetHours(date: Date): number {
  const utcMs = date.getTime();
  const nyMs = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTime();
  return Math.round((utcMs - nyMs) / (1000 * 60 * 60));
}

/**
 * Compute the next weekly contest window.
 *
 * Registration: Sunday 00:00 ET -> Monday 00:00 ET
 * Contest:      Monday 00:00 ET -> Sunday 00:00 ET (7 days)
 *
 * All times are stored in UTC. Offset is computed dynamically (EST=UTC-5, EDT=UTC-4).
 */
export function getNextContestDates(now = new Date()) {
  const EST_OFFSET_HOURS = getNYOffsetHours(now);

  const estNow = new Date(now.getTime() - EST_OFFSET_HOURS * 60 * 60 * 1000);
  const estDay = estNow.getUTCDay();

  // Next Sunday 00:00 EST (registration opens)
  const daysUntilSunday = estDay === 0 ? 7 : 7 - estDay;
  const registrationOpensEST = new Date(estNow);
  registrationOpensEST.setUTCHours(0, 0, 0, 0);
  registrationOpensEST.setUTCDate(registrationOpensEST.getUTCDate() + daysUntilSunday);

  // Monday 00:00 EST (contest starts / registration closes)
  const startsAtEST = new Date(registrationOpensEST);
  startsAtEST.setUTCDate(startsAtEST.getUTCDate() + 1);

  // Following Sunday 00:00 EST (contest ends)
  const endsAtEST = new Date(startsAtEST);
  endsAtEST.setUTCDate(endsAtEST.getUTCDate() + 6);

  // Convert back to UTC
  const toUTC = (d: Date) => new Date(d.getTime() + EST_OFFSET_HOURS * 60 * 60 * 1000);

  return {
    registrationOpensAt: toUTC(registrationOpensEST),
    startsAt: toUTC(startsAtEST),
    endsAt: toUTC(endsAtEST),
  };
}

/**
 * Create the next weekly contest if one doesn't already exist.
 * Returns the contest ID (new or existing).
 */
export async function createNextContest(supabase: SupabaseClient): Promise<{
  contestId: string;
  created: boolean;
}> {
  const dates = getNextContestDates();

  // Check if a contest already exists for this window
  const { data: existing } = await supabase
    .from('contests')
    .select('id')
    .eq('starts_at', dates.startsAt.toISOString())
    .limit(1)
    .single();

  if (existing) {
    return { contestId: existing.id, created: false };
  }

  const { data: contest, error } = await supabase
    .from('contests')
    .insert({
      registration_opens_at: dates.registrationOpensAt.toISOString(),
      starts_at: dates.startsAt.toISOString(),
      ends_at: dates.endsAt.toISOString(),
      status: 'registration',
    })
    .select('id')
    .single();

  if (error || !contest) {
    throw new Error(`Failed to create contest: ${error?.message}`);
  }

  return { contestId: contest.id, created: true };
}

export interface ContestTransition {
  contestId: string;
  from: string;
  to: string;
}

/**
 * Transition contest statuses based on current time.
 * - registration -> active (when starts_at is reached)
 * - active -> complete (when ends_at is reached)
 */
export async function tickContestStatuses(supabase: SupabaseClient): Promise<ContestTransition[]> {
  const now = new Date().toISOString();
  const transitions: ContestTransition[] = [];

  // Registration -> active (lock time reached)
  const { data: toActivate } = await supabase
    .from('contests')
    .select('id')
    .eq('status', 'registration')
    .lte('starts_at', now);

  for (const contest of toActivate ?? []) {
    await supabase
      .from('contests')
      .update({ status: 'active' })
      .eq('id', contest.id);
    transitions.push({ contestId: contest.id, from: 'registration', to: 'active' });
  }

  // Active -> complete (end time reached)
  const { data: toComplete } = await supabase
    .from('contests')
    .select('id')
    .eq('status', 'active')
    .lte('ends_at', now);

  for (const contest of toComplete ?? []) {
    await supabase
      .from('contests')
      .update({ status: 'complete' })
      .eq('id', contest.id);
    transitions.push({ contestId: contest.id, from: 'active', to: 'complete' });
  }

  return transitions;
}
