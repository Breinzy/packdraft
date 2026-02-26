import type { SupabaseClient } from '@supabase/supabase-js';
import { getLatestPricesForProducts } from '@/lib/portfolio/helpers';

/**
 * Auto-lock all unlocked portfolios for a contest.
 * Called when a contest transitions from registration to active.
 * Snapshots current prices as price_at_lock on all items.
 */
export async function autoLockPortfolios(
  supabase: SupabaseClient,
  contestId: string
): Promise<{ locked: number; errors: string[] }> {
  const errors: string[] = [];

  const { data: unlocked } = await supabase
    .from('portfolios')
    .select('id')
    .eq('contest_id', contestId)
    .eq('is_locked', false);

  if (!unlocked || unlocked.length === 0) {
    return { locked: 0, errors: [] };
  }

  const portfolioIds = unlocked.map((p) => p.id);

  const { data: allItems } = await supabase
    .from('portfolio_items')
    .select('portfolio_id, product_id, quantity')
    .in('portfolio_id', portfolioIds);

  const productIds = [...new Set((allItems ?? []).map((i) => i.product_id))];
  const prices = await getLatestPricesForProducts(supabase, productIds);

  // Snapshot price_at_lock for every item
  for (const item of allItems ?? []) {
    const price = prices.get(item.product_id);
    if (price === undefined) continue;

    const { error } = await supabase
      .from('portfolio_items')
      .update({ price_at_lock: price })
      .eq('portfolio_id', item.portfolio_id)
      .eq('product_id', item.product_id);

    if (error) {
      errors.push(`Failed to set price_at_lock for item ${item.product_id} in portfolio ${item.portfolio_id}`);
    }
  }

  // Lock all portfolios in one go
  const now = new Date().toISOString();
  const { error: lockError } = await supabase
    .from('portfolios')
    .update({ is_locked: true, submitted_at: now })
    .in('id', portfolioIds);

  if (lockError) {
    errors.push(`Failed to lock portfolios: ${lockError.message}`);
    return { locked: 0, errors };
  }

  return { locked: unlocked.length, errors };
}
