import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BUDGET } from '@/types';
import {
  getLatestPrice,
  getLatestPricesForProducts,
  validateBudget,
} from '@/lib/portfolio/helpers';

/**
 * Add or increment a product in the user's portfolio.
 * POST /api/portfolio/add
 * Body: { portfolioId, productId, quantity? }
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

  const { portfolioId, productId, quantity = 1 } = body;

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

  const { data: product } = await supabase
    .from('products')
    .select('id, is_active')
    .eq('id', productId)
    .single();

  if (!product || !product.is_active) {
    return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
  }

  const price = await getLatestPrice(supabase, productId);
  if (price === null) {
    return NextResponse.json({ error: 'No price data for product' }, { status: 422 });
  }

  const { data: existingItems } = await supabase
    .from('portfolio_items')
    .select('product_id, quantity')
    .eq('portfolio_id', portfolioId);

  const allProductIds = [
    ...new Set([...(existingItems ?? []).map((i) => i.product_id), productId]),
  ];
  const prices = await getLatestPricesForProducts(supabase, allProductIds);

  const itemsWithPrices = (existingItems ?? []).map((i) => ({
    ...i,
    price: prices.get(i.product_id) ?? 0,
  }));

  const validation = validateBudget(itemsWithPrices, productId, price, quantity);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const existing = existingItems?.find((i) => i.product_id === productId);
  const newQty = (existing?.quantity ?? 0) + quantity;

  const { error: upsertError } = await supabase
    .from('portfolio_items')
    .upsert(
      {
        portfolio_id: portfolioId,
        product_id: productId,
        quantity: newQty,
        price_at_lock: price,
      },
      { onConflict: 'portfolio_id,product_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Recalculate cash from scratch
  const { data: updatedItems } = await supabase
    .from('portfolio_items')
    .select('product_id, quantity')
    .eq('portfolio_id', portfolioId);

  const updatedPrices = await getLatestPricesForProducts(
    supabase,
    (updatedItems ?? []).map((i) => i.product_id)
  );
  const totalSpend = (updatedItems ?? []).reduce(
    (s, i) => s + i.quantity * (updatedPrices.get(i.product_id) ?? 0),
    0
  );
  const cashRemaining = BUDGET - totalSpend;

  await supabase
    .from('portfolios')
    .update({ cash_remaining: cashRemaining })
    .eq('id', portfolioId);

  return NextResponse.json({ ok: true, quantity: newQty, cashRemaining });
}
