import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import Ticker from '@/components/layout/Ticker';
import PortfolioBuilder from '@/components/portfolio/PortfolioBuilder';
import type { ProductWithPrice, PortfolioItemWithProduct } from '@/types';

export default async function DraftPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Fetch portfolio for the user in the current contest
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch products with latest prices
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  // Fetch latest price for each product
  const productIds = (products ?? []).map((p) => p.id);
  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('*')
    .in('product_id', productIds)
    .order('recorded_at', { ascending: false });

  // Dedupe: keep only the latest snapshot per product
  const latestPrices = new Map<string, { price: number; change_7d: number; volume: number }>();
  for (const snap of snapshots ?? []) {
    if (!latestPrices.has(snap.product_id)) {
      latestPrices.set(snap.product_id, {
        price: Number(snap.price),
        change_7d: Number(snap.change_7d),
        volume: snap.volume ?? 0,
      });
    }
  }

  const productsWithPrices: ProductWithPrice[] = (products ?? [])
    .map((p) => {
      const priceData = latestPrices.get(p.id);
      return {
        ...p,
        price: priceData?.price ?? 0,
        change_7d: priceData?.change_7d ?? 0,
        volume: priceData?.volume ?? 0,
      };
    })
    .filter((p) => p.price > 0);

  // Fetch existing portfolio items
  let portfolioItems: PortfolioItemWithProduct[] = [];
  if (portfolio) {
    const { data: items } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('portfolio_id', portfolio.id);

    portfolioItems = (items ?? []).map((item) => {
      const product = productsWithPrices.find((p) => p.id === item.product_id);
      return {
        ...item,
        quantity: item.quantity,
        price_at_lock: item.price_at_lock ? Number(item.price_at_lock) : null,
        product: product ?? {
          id: item.product_id,
          name: 'Unknown',
          set_name: '',
          type: 'booster_box' as const,
          tcgplayer_id: null,
          image_code: null,
          is_active: true,
          created_at: '',
          price: 0,
          change_7d: 0,
          volume: 0,
        },
      };
    });
  }

  return (
    <>
      <Header />
      <Ticker />
      <PortfolioBuilder
        initialProducts={productsWithPrices}
        initialPortfolio={portfolio}
        initialItems={portfolioItems}
      />
    </>
  );
}
