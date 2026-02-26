import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { assignToLeague } from '@/lib/contest/leagueAssignment';
import { BUDGET } from '@/types';

/**
 * Register a returning user for the current contest.
 * Creates a league assignment and empty portfolio.
 * Uses service role for writes (league/portfolio creation bypasses RLS).
 * POST /api/portfolio/register
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }
  const admin = createServiceClient(url, serviceKey);

  const { data: contest } = await admin
    .from('contests')
    .select('id, status')
    .eq('status', 'registration')
    .order('starts_at', { ascending: true })
    .limit(1)
    .single();

  if (!contest) {
    return NextResponse.json(
      { error: 'No contest is currently in registration' },
      { status: 404 }
    );
  }

  const { data: existingPortfolio } = await admin
    .from('portfolios')
    .select('id')
    .eq('user_id', user.id)
    .eq('contest_id', contest.id)
    .limit(1)
    .single();

  if (existingPortfolio) {
    return NextResponse.json(
      { error: 'Already registered for this contest', portfolioId: existingPortfolio.id },
      { status: 409 }
    );
  }

  let leagueId: string;
  try {
    leagueId = await assignToLeague(admin, contest.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'League assignment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await admin
    .from('profiles')
    .update({ current_league_id: leagueId })
    .eq('id', user.id);

  const { data: portfolio, error: portfolioError } = await admin
    .from('portfolios')
    .insert({
      user_id: user.id,
      contest_id: contest.id,
      league_id: leagueId,
      cash_remaining: BUDGET,
      is_locked: false,
    })
    .select('id')
    .single();

  if (portfolioError || !portfolio) {
    return NextResponse.json(
      { error: `Failed to create portfolio: ${portfolioError?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    portfolioId: portfolio.id,
    leagueId,
    contestId: contest.id,
  });
}
