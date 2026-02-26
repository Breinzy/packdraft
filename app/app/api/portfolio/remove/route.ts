import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BUDGET } from '@/types';
import { getLatestPricesForProducts } from '@/lib/portfolio/helpers';

/**
 * Remove or decrement a product from the user's portfolio.
 * POST /api/portfolio/remove
 * Body: { portfolioId, productId }
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
  if (!body?.portfolioId || !body?.productId) {
    return NextResponse.json(
      { error: 'Missing portfolioId or productId' },
      { status: 400 }
    );
  }

  const { portfolioId, productId } = body;

  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id, user_id, is_locked')
    .eq('id', portfolioId)
    .single();

  if (!portfolio || portfolio.user_id !== user.id) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }
  if (portfolio.is_locked) {
    return NextResponse.json({ error: 'Portfolio is locked' }, { status: 409 });
  }

  const { data: item } = await supabase
    .from('portfolio_items')
    .select('quantity')
    .eq('portfolio_id', portfolioId)
    .eq('product_id', productId)
    .single();

  if (!item) {
    return NextResponse.json({ error: 'Item not in portfolio' }, { status: 404 });
  }

  if (item.quantity <= 1) {
    await supabase
      .from('portfolio_items')
      .delete()
      .eq('portfolio_id', portfolioId)
      .eq('product_id', productId);
  } else {
    await supabase
      .from('portfolio_items')
      .update({ quantity: item.quantity - 1 })
      .eq('portfolio_id', portfolioId)
      .eq('product_id', productId);
  }

  // Recalculate cash from scratch
  const { data: updatedItems } = await supabase
    .from('portfolio_items')
    .select('product_id, quantity')
    .eq('portfolio_id', portfolioId);

  const prices = await getLatestPricesForProducts(
    supabase,
    (updatedItems ?? []).map((i) => i.product_id)
  );
  const totalSpend = (updatedItems ?? []).reduce(
    (s, i) => s + i.quantity * (prices.get(i.product_id) ?? 0),
    0
  );
  const cashRemaining = BUDGET - totalSpend;

  await supabase
    .from('portfolios')
    .update({ cash_remaining: cashRemaining })
    .eq('id', portfolioId);

  const newQty = item.quantity <= 1 ? 0 : item.quantity - 1;

  return NextResponse.json({ ok: true, quantity: newQty, cashRemaining });
}
