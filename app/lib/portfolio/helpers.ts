import type { SupabaseClient } from '@supabase/supabase-js';
import { BUDGET, MAX_SLOTS, MAX_PER_PRODUCT } from '@/types';

export async function getLatestPrice(
  supabase: SupabaseClient,
  productId: string
): Promise<number | null> {
  const { data } = await supabase
    .from('price_snapshots')
    .select('price')
    .eq('product_id', productId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  return data ? Number(data.price) : null;
}

export async function getLatestPricesForProducts(
  supabase: SupabaseClient,
  productIds: string[]
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();

  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('product_id, price')
    .in('product_id', productIds)
    .order('recorded_at', { ascending: false });

  const prices = new Map<string, number>();
  for (const snap of snapshots ?? []) {
    if (!prices.has(snap.product_id)) {
      prices.set(snap.product_id, Number(snap.price));
    }
  }
  return prices;
}

export async function getPortfolioWithItems(
  supabase: SupabaseClient,
  portfolioId: string
) {
  const [{ data: portfolio }, { data: items }] = await Promise.all([
    supabase.from('portfolios').select('*').eq('id', portfolioId).single(),
    supabase.from('portfolio_items').select('*').eq('portfolio_id', portfolioId),
  ]);
  return { portfolio, items: items ?? [] };
}

export function validateBudget(
  currentItems: { product_id: string; quantity: number; price: number }[],
  addProductId: string,
  addPrice: number,
  addQty: number
): { valid: boolean; error?: string } {
  const totalSlots = currentItems.reduce((s, i) => s + i.quantity, 0);
  if (totalSlots + addQty > MAX_SLOTS) {
    return { valid: false, error: `Would exceed ${MAX_SLOTS} slot limit` };
  }

  const existing = currentItems.find((i) => i.product_id === addProductId);
  const newQty = (existing?.quantity ?? 0) + addQty;
  if (newQty > MAX_PER_PRODUCT) {
    return { valid: false, error: `Would exceed ${MAX_PER_PRODUCT} per-product limit` };
  }

  const currentSpend = currentItems.reduce((s, i) => s + i.quantity * i.price, 0);
  const additionalCost = addQty * addPrice;
  if (currentSpend + additionalCost > BUDGET) {
    return { valid: false, error: `Would exceed $${BUDGET} budget` };
  }

  return { valid: true };
}
