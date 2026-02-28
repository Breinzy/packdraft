import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import { formatCurrency, formatPct } from '@/lib/utils';
import { BUDGET, CASH_DECAY_RATE } from '@/types';
import type { Profile, Product } from '@/types';

interface PortfolioItemRow {
  id: string;
  product_id: string;
  quantity: number;
  price_at_lock: number | null;
  products: Pick<Product, 'id' | 'name' | 'card_name' | 'set_name' | 'type' | 'category' | 'psa_grade'>;
}

interface PortfolioRow {
  id: string;
  user_id: string;
  league_id: string;
  cash_remaining: number;
  final_value: number | null;
  final_rank_global: number | null;
  final_rank_league: number | null;
  is_locked: boolean;
  profiles: Profile;
  items: PortfolioItemRow[];
  currentValue: number;
  returnPct: number;
}

async function getResultsData(contestId: string) {
  const supabase = await createClient();

  const { data: contest } = await supabase
    .from('contests')
    .select('id, status, starts_at, ends_at')
    .eq('id', contestId)
    .single();

  if (!contest) return null;

  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('*, profiles(*)')
    .eq('contest_id', contestId)
    .eq('is_locked', true)
    .order('final_rank_global', { ascending: true, nullsFirst: false });

  if (!portfolios || portfolios.length === 0) {
    return { contest, portfolios: [] };
  }

  const portfolioIds = portfolios.map((p) => p.id);

  const { data: allItems } = await supabase
    .from('portfolio_items')
    .select('*, products(id, name, card_name, set_name, type, category, psa_grade)')
    .in('portfolio_id', portfolioIds);

  const productIds = [...new Set((allItems ?? []).map((i) => i.product_id))];
  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('product_id, price, recorded_at')
    .in('product_id', productIds)
    .order('recorded_at', { ascending: false });

  const latestPrices = new Map<string, number>();
  for (const snap of snapshots ?? []) {
    if (!latestPrices.has(snap.product_id)) {
      latestPrices.set(snap.product_id, Number(snap.price));
    }
  }

  const enriched: PortfolioRow[] = portfolios.map((p) => {
    const items = (allItems ?? []).filter((i) => i.portfolio_id === p.id) as PortfolioItemRow[];
    const productValue = items.reduce(
      (sum, item) => sum + item.quantity * (latestPrices.get(item.product_id) ?? Number(item.price_at_lock ?? 0)),
      0
    );
    const cashWithDecay = Number(p.cash_remaining) * (1 - CASH_DECAY_RATE);
    const currentValue = p.final_value ?? (productValue + cashWithDecay);
    const returnPct = ((currentValue - BUDGET) / BUDGET) * 100;

    return {
      ...p,
      profiles: p.profiles as unknown as Profile,
      items,
      currentValue,
      returnPct,
    };
  });

  enriched.sort((a, b) => {
    if (a.final_rank_global !== null && b.final_rank_global !== null) {
      return a.final_rank_global - b.final_rank_global;
    }
    return b.currentValue - a.currentValue;
  });

  return { contest, portfolios: enriched };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const { contestId } = await params;
  const data = await getResultsData(contestId);

  if (!data) notFound();

  const { contest, portfolios } = data;
  const isComplete = contest.status === 'complete';
  const winner = portfolios[0] ?? null;
  const endsDate = new Date(contest.ends_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-10 max-w-5xl mx-auto w-full space-y-6 md:space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] text-slate-600 tracking-widest mb-1.5">CONTEST RESULTS</div>
            <h1 className="text-lg md:text-2xl font-bold tracking-widest text-white">
              WEEK OF {endsDate.toUpperCase()}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isComplete ? '#fbbf24' : '#34d399' }}
              />
              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: isComplete ? '#fbbf24' : '#34d399' }}
              >
                {isComplete ? 'FINAL' : 'IN PROGRESS'}
              </span>
            </div>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs text-slate-500 tracking-widest hover:text-slate-300 transition-colors border border-white/[0.06] rounded-lg px-4 py-2"
          >
            ← LEADERBOARD
          </Link>
        </div>

        {portfolios.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-4">📋</div>
            <div className="text-sm text-slate-500 tracking-wider">NO LOCKED PORTFOLIOS YET</div>
            <div className="text-xs text-slate-700 tracking-wider mt-1">
              Results appear once players lock their picks
            </div>
          </div>
        ) : (
          <>
            {/* Winner callout */}
            {winner && (
              <WinnerCard portfolio={winner} isComplete={isComplete} />
            )}

            {/* All portfolios */}
            <div className="space-y-3">
              <div className="text-[10px] text-slate-600 tracking-widest px-1">
                ALL PORTFOLIOS — {portfolios.length} PLAYERS
              </div>
              {portfolios.map((portfolio, idx) => (
                <PortfolioReveal
                  key={portfolio.id}
                  portfolio={portfolio}
                  rank={idx + 1}
                  isComplete={isComplete}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function WinnerCard({
  portfolio,
  isComplete,
}: {
  portfolio: PortfolioRow;
  isComplete: boolean;
}) {
  const name = portfolio.profiles.display_name || portfolio.profiles.email.split('@')[0];
  const topPick = portfolio.items.sort((a, b) => {
    const aPrice = Number(a.price_at_lock ?? 0) * a.quantity;
    const bPrice = Number(b.price_at_lock ?? 0) * b.quantity;
    return bPrice - aPrice;
  })[0];

  return (
    <div
      className="rounded-2xl border p-5 md:p-8"
      style={{
        background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(251,191,36,0.02))',
        borderColor: 'rgba(251,191,36,0.2)',
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4 md:mb-6">
        <div>
          <div className="text-[10px] text-amber-500/60 tracking-widest mb-1">
            {isComplete ? '🏆 WINNER' : '🥇 CURRENT LEADER'}
          </div>
          <div className="text-xl md:text-2xl font-bold text-amber-400 tracking-wider">
            {name.toUpperCase()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-600 tracking-widest mb-1">FINAL VALUE</div>
          <div className="text-xl md:text-2xl font-bold text-white">
            {formatCurrency(portfolio.currentValue)}
          </div>
          <div
            className="text-sm font-bold mt-0.5"
            style={{ color: portfolio.returnPct >= 0 ? '#34d399' : '#f87171' }}
          >
            {formatPct(portfolio.returnPct)}
          </div>
        </div>
      </div>
      {topPick && (
        <div className="text-xs text-slate-500 tracking-wider">
          TOP PICK:{' '}
          <span className="text-slate-300">
            {topPick.products.card_name ?? topPick.products.name}
            {topPick.quantity > 1 && ` ×${topPick.quantity}`}
          </span>
        </div>
      )}
    </div>
  );
}

function PortfolioReveal({
  portfolio,
  rank,
  isComplete,
}: {
  portfolio: PortfolioRow;
  rank: number;
  isComplete: boolean;
}) {
  const name = portfolio.profiles.display_name || portfolio.profiles.email.split('@')[0];

  const rankColors: Record<number, string> = {
    1: '#fbbf24',
    2: '#94a3b8',
    3: '#d97706',
  };
  const rankColor = rankColors[rank] ?? '#334155';

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Portfolio header */}
      <div className="px-4 md:px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold w-8" style={{ color: rankColor }}>
            #{rank}
          </span>
          <span className="text-sm text-slate-200 font-semibold tracking-wider">
            {name.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="text-right hidden md:block">
            <div className="text-[10px] text-slate-600 tracking-widest">CASH LEFT</div>
            <div className="text-xs text-slate-400">
              {formatCurrency(Number(portfolio.cash_remaining))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-600 tracking-widest">
              {isComplete ? 'FINAL' : 'VALUE'}
            </div>
            <div className="text-sm font-bold text-white">
              {formatCurrency(portfolio.currentValue)}
            </div>
          </div>
          <div
            className="text-sm font-bold"
            style={{ color: portfolio.returnPct >= 0 ? '#34d399' : '#f87171' }}
          >
            {formatPct(portfolio.returnPct)}
          </div>
        </div>
      </div>

      {/* Portfolio items */}
      {portfolio.items.length === 0 ? (
        <div className="px-5 py-4 text-xs text-slate-600 tracking-wider">EMPTY PORTFOLIO</div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {portfolio.items
            .sort((a, b) => {
              const aVal = Number(a.price_at_lock ?? 0) * a.quantity;
              const bVal = Number(b.price_at_lock ?? 0) * b.quantity;
              return bVal - aVal;
            })
            .map((item) => (
              <PickRow key={item.id} item={item} />
            ))}
        </div>
      )}
    </div>
  );
}

function PickRow({ item }: { item: PortfolioItemRow }) {
  const product = item.products;
  const displayName = product.card_name ?? product.name;
  const lockPrice = Number(item.price_at_lock ?? 0);
  const totalAtLock = lockPrice * item.quantity;
  const isGraded = product.category === 'graded';

  return (
    <div className="px-4 md:px-5 py-2.5 flex items-center gap-3">
      <div className="flex-shrink-0">
        {isGraded ? (
          <div
            className="h-6 px-1.5 rounded flex items-center justify-center text-[9px] font-bold tracking-wider border"
            style={{
              background:
                product.psa_grade === 10
                  ? 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.3))'
                  : 'linear-gradient(135deg, rgba(148,163,184,0.15), rgba(148,163,184,0.3))',
              borderColor: product.psa_grade === 10 ? '#fbbf2444' : '#94a3b844',
              color: product.psa_grade === 10 ? '#fbbf24' : '#94a3b8',
            }}
          >
            PSA {product.psa_grade}
          </div>
        ) : (
          <div className="w-6 h-6 rounded flex items-center justify-center text-xs border border-white/[0.08] bg-white/[0.04] text-slate-500">
            📦
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-200 truncate">{displayName}</div>
        <div className="text-xs text-slate-600 truncate">{product.set_name}</div>
      </div>

      <div className="text-right flex-shrink-0">
        {item.quantity > 1 && (
          <div className="text-[10px] text-slate-600 tracking-wider">×{item.quantity}</div>
        )}
        <div className="text-xs text-slate-400">{formatCurrency(totalAtLock)}</div>
      </div>
    </div>
  );
}
