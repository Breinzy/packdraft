import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLatestPricesForProducts } from '@/lib/portfolio/helpers';

/**
 * Lock the user's portfolio. Snapshots current prices as price_at_lock.
 * POST /api/portfolio/lock
 * Body: { portfolioId }
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.portfolioId) {
    return NextResponse.json({ error: 'Missing portfolioId' }, { status: 400 });
  }

  const { portfolioId } = body;

  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id, user_id, is_locked, cash_remaining')
    .eq('id', portfolioId)
    .single();

  if (!portfolio || portfolio.user_id !== user.id) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }
  if (portfolio.is_locked) {
    return NextResponse.json({ error: 'Portfolio is already locked' }, { status: 409 });
  }

  const { data: items } = await supabase
    .from('portfolio_items')
    .select('product_id, quantity')
    .eq('portfolio_id', portfolioId);

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: 'Cannot lock an empty portfolio' },
      { status: 422 }
    );
  }

  const prices = await getLatestPricesForProducts(
    supabase,
    items.map((i) => i.product_id)
  );

  for (const item of items) {
    const lockPrice = prices.get(item.product_id);
    if (lockPrice === undefined) continue;

    await supabase
      .from('portfolio_items')
      .update({ price_at_lock: lockPrice })
      .eq('portfolio_id', portfolioId)
      .eq('product_id', item.product_id);
  }

  const now = new Date().toISOString();
  await supabase
    .from('portfolios')
    .update({ is_locked: true, submitted_at: now })
    .eq('id', portfolioId);

  return NextResponse.json({ ok: true, lockedAt: now });
}
