import { BUDGET, CASH_DECAY_RATE } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calculate final portfolio value:
 * sum(quantity × end_price) + (cash_remaining × (1 - CASH_DECAY_RATE))
 *
 * Only scores contests that have reached their ends_at time.
 */
export async function scoreContest(supabase: SupabaseClient, contestId: string) {
  // Verify the contest has reached its end time
  const { data: contest } = await supabase
    .from('contests')
    .select('ends_at, status')
    .eq('id', contestId)
    .single();

  if (!contest) throw new Error('Contest not found');

  if (contest.status === 'complete') {
    return; // Already scored
  }

  const endsAt = new Date(contest.ends_at);
  if (new Date() < endsAt) {
    throw new Error(`Contest has not ended yet. Ends at ${contest.ends_at}`);
  }

  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('*')
    .eq('contest_id', contestId)
    .eq('is_locked', true);

  if (!portfolios || portfolios.length === 0) return;

  const portfolioIds = portfolios.map((p) => p.id);
  const { data: allItems } = await supabase
    .from('portfolio_items')
    .select('*')
    .in('portfolio_id', portfolioIds);

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

  const scored = portfolios.map((portfolio) => {
    const items = (allItems ?? []).filter((i) => i.portfolio_id === portfolio.id);
    const productValue = items.reduce(
      (sum, item) =>
        sum +
        item.quantity * (latestPrices.get(item.product_id) ?? Number(item.price_at_lock ?? 0)),
      0
    );
    const cashWithDecay = Number(portfolio.cash_remaining) * (1 - CASH_DECAY_RATE);
    const finalValue = productValue + cashWithDecay;

    return {
      id: portfolio.id,
      user_id: portfolio.user_id,
      league_id: portfolio.league_id,
      final_value: finalValue,
    };
  });

  // Rank globally
  scored.sort((a, b) => b.final_value - a.final_value);
  const globalRanks = new Map(scored.map((s, i) => [s.id, i + 1]));

  // Rank per league
  const byLeague = new Map<string, typeof scored>();
  for (const s of scored) {
    const existing = byLeague.get(s.league_id) ?? [];
    existing.push(s);
    byLeague.set(s.league_id, existing);
  }

  const leagueRanks = new Map<string, number>();
  for (const [, members] of byLeague) {
    members.sort((a, b) => b.final_value - a.final_value);
    members.forEach((m, i) => leagueRanks.set(m.id, i + 1));
  }

  for (const s of scored) {
    await supabase
      .from('portfolios')
      .update({
        final_value: s.final_value,
        final_rank_global: globalRanks.get(s.id),
        final_rank_league: leagueRanks.get(s.id),
      })
      .eq('id', s.id);
  }

  await supabase
    .from('contests')
    .update({ status: 'complete' })
    .eq('id', contestId);
}

/**
 * Calculate a single portfolio's current value (for live leaderboard)
 */
export function calculatePortfolioValue(
  items: { quantity: number; currentPrice: number }[],
  cashRemaining: number
): { totalValue: number; returnPct: number } {
  const productValue = items.reduce(
    (sum, item) => sum + item.quantity * item.currentPrice,
    0
  );
  const cashWithDecay = cashRemaining * (1 - CASH_DECAY_RATE);
  const totalValue = productValue + cashWithDecay;
  const returnPct = ((totalValue - BUDGET) / BUDGET) * 100;

  return { totalValue, returnPct };
}
