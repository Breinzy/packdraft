import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import Ticker from '@/components/layout/Ticker';
import LeagueTable from '@/components/leaderboard/LeagueTable';
import GlobalTable from '@/components/leaderboard/GlobalTable';
import { BUDGET, CASH_DECAY_RATE } from '@/types';
import type { LeaderboardEntry, Profile, Portfolio, League } from '@/types';

async function buildLeaderboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contestId: string,
  leagueId?: string
): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from('portfolios')
    .select('*, profiles(*)')
    .eq('contest_id', contestId)
    .eq('is_locked', true);

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data: portfolios } = await query;
  if (!portfolios || portfolios.length === 0) return [];

  // Fetch all portfolio items for these portfolios
  const portfolioIds = portfolios.map((p) => p.id);
  const { data: allItems } = await supabase
    .from('portfolio_items')
    .select('*, products(id, name)')
    .in('portfolio_id', portfolioIds);

  // Fetch latest prices
  const productIds = [...new Set((allItems ?? []).map((i) => i.product_id))];
  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('*')
    .in('product_id', productIds)
    .order('recorded_at', { ascending: false });

  const latestPrices = new Map<string, number>();
  for (const snap of snapshots ?? []) {
    if (!latestPrices.has(snap.product_id)) {
      latestPrices.set(snap.product_id, Number(snap.price));
    }
  }

  // Calculate values
  const entries: LeaderboardEntry[] = portfolios.map((p) => {
    const profile = p.profiles as unknown as Profile;
    const items = (allItems ?? []).filter((i) => i.portfolio_id === p.id);
    const productValue = items.reduce(
      (sum, item) => sum + item.quantity * (latestPrices.get(item.product_id) ?? Number(item.price_at_lock ?? 0)),
      0
    );
    const cashWithDecay = Number(p.cash_remaining) * (1 - CASH_DECAY_RATE);
    const totalValue = productValue + cashWithDecay;
    const returnPct = ((totalValue - BUDGET) / BUDGET) * 100;

    return {
      rank: 0,
      profile,
      portfolio: p as unknown as Portfolio,
      total_value: totalValue,
      return_pct: returnPct,
    };
  });

  entries.sort((a, b) => b.total_value - a.total_value);
  entries.forEach((e, i) => (e.rank = i + 1));

  return entries;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get current contest
  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .in('status', ['registration', 'active', 'pending'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .single();

  // Get last completed contest for results link
  const { data: lastCompleted } = await supabase
    .from('contests')
    .select('id, ends_at')
    .eq('status', 'complete')
    .order('ends_at', { ascending: false })
    .limit(1)
    .single();

  let leagueEntries: LeaderboardEntry[] = [];
  let globalEntries: LeaderboardEntry[] = [];
  let league: League | null = null;

  if (contest) {
    globalEntries = await buildLeaderboard(supabase, contest.id);

    // If user is signed in, get their league
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.current_league_id) {
        const { data: leagueData } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', profile.current_league_id)
          .single();
        league = leagueData;

        leagueEntries = await buildLeaderboard(
          supabase,
          contest.id,
          profile.current_league_id
        );
      }
    }
  }

  return (
    <>
      <Header />
      <Ticker />
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 max-w-5xl mx-auto w-full space-y-4 md:space-y-6">
        {!contest ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-4">🏆</div>
            <div className="text-sm text-slate-500 tracking-wider">
              NO ACTIVE CONTEST
            </div>
            <div className="text-[10px] text-slate-700 tracking-wider mt-1">
              Check back when a new week starts
            </div>
          </div>
        ) : (
          <>
            {league && (
              <LeagueTable
                entries={leagueEntries}
                currentUserId={user?.id}
                leagueName={league.name.toUpperCase()}
                allLocked={!!league.all_locked_at}
              />
            )}
            <GlobalTable entries={globalEntries} currentUserId={user?.id} />
            {lastCompleted && (
              <div className="text-center pt-2">
                <Link
                  href={`/results/${lastCompleted.id}`}
                  className="text-xs text-slate-600 hover:text-slate-400 tracking-widest transition-colors"
                >
                  VIEW LAST WEEK&apos;S RESULTS →
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
