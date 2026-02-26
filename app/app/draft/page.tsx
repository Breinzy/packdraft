import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import Ticker from '@/components/layout/Ticker';
import PortfolioBuilder from '@/components/portfolio/PortfolioBuilder';
import type { ProductWithPrice, PortfolioItemWithProduct, ContestStatus } from '@/types';

export default async function DraftPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Find the current/upcoming contest
  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .in('status', ['registration', 'active'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .single();

  const contestStatus: ContestStatus | null = contest?.status ?? null;

  // Fetch portfolio for the user in the current contest
  const { data: portfolio } = contest
    ? await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .eq('contest_id', contest.id)
        .limit(1)
        .single()
    : { data: null };

  // Fetch products with latest prices
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  const productIds = (products ?? []).map((p) => p.id);
  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('*')
    .in('product_id', productIds)
    .order('recorded_at', { ascending: false });

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
          category: 'sealed' as const,
          tcgplayer_id: null,
          image_code: null,
          card_name: null,
          card_number: null,
          psa_grade: null,
          is_active: true,
          created_at: '',
          price: 0,
          change_7d: 0,
          volume: 0,
        },
      };
    });
  }

  const isActiveContestLocked = contestStatus === 'active';

  return (
    <>
      <Header />
      <Ticker />
      {!contest && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">📅</div>
            <div className="text-base text-slate-400 tracking-wider mb-2">NO ACTIVE CONTEST</div>
            <div className="text-sm text-slate-600 tracking-wider">
              Check back Sunday for the next registration window.
            </div>
          </div>
        </div>
      )}
      {contest && contestStatus === 'registration' && !portfolio && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🔓</div>
            <div className="text-base text-accent-light tracking-wider mb-2">REGISTRATION IS OPEN</div>
            <div className="text-sm text-slate-600 tracking-wider max-w-xs mx-auto">
              Leagues lock Monday at 12:00 AM EST. Your portfolio will be created when you add your first product.
            </div>
          </div>
        </div>
      )}
      {contest && (contestStatus === 'registration' || !isActiveContestLocked || portfolio) && (
        <>
          {isActiveContestLocked && !portfolio?.is_locked && (
            <div className="bg-red/10 border-b border-red/20 px-6 py-2.5 text-center text-sm text-red tracking-wider">
              CONTEST IS ACTIVE — PORTFOLIO EDITING IS LOCKED
            </div>
          )}
          {contest && (portfolio || contestStatus === 'registration') && (
            <PortfolioBuilder
              initialProducts={productsWithPrices}
              initialPortfolio={portfolio}
              initialItems={portfolioItems}
              readOnly={isActiveContestLocked}
            />
          )}
        </>
      )}
    </>
  );
}
