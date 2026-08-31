import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import AssetThumb from '@/components/market/AssetThumb';
import Sparkline from '@/components/market/Sparkline';
import TradeTicket from '@/components/tournament/TradeTicket';
import { getCatalogAsset, asAsset } from '@/lib/market/catalog';
import { assetImageSrc } from '@/lib/market/images';
import { getPriceHistory } from '@/lib/market/prices';
import { createClient } from '@/lib/supabase/server';
import { getUserActiveBooks, getUserPortfolio, getHoldings } from '@/lib/tournament/queries';
import { canTradeStatus } from '@/lib/tournament/lifecycle';
import { formatCurrency, formatPct } from '@/lib/utils';
import { ASSET_TYPE_LABELS } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tournament?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const asset = await getCatalogAsset(supabase, id);
  if (!asset) notFound();

  const history = await getPriceHistory(supabase, id);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const books = user ? await getUserActiveBooks(supabase, user.id) : [];
  const tradeable = books.filter((b) => canTradeStatus(b.tournament.status));
  const selected =
    tradeable.find((b) => b.tournament.id === sp.tournament) ??
    tradeable[0] ??
    null;

  let ownedQty = 0;
  if (selected) {
    const portfolio = await getUserPortfolio(supabase, selected.tournament.id, selected.portfolio.user_id);
    if (portfolio) {
      const holdings = await getHoldings(supabase, portfolio.id);
      ownedQty = holdings.find((h) => h.asset_id === asset.id)?.quantity ?? 0;
    }
  }

  const changeColor =
    (asset.change_7d ?? 0) > 0 ? 'text-green' : (asset.change_7d ?? 0) < 0 ? 'text-red' : 'text-slate-500';

  return (
    <AppShell nav="market">
      <main className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-6">
        <Link href="/assets" className="text-sm text-slate-500 tracking-wider min-h-11 inline-flex items-center">
          ← MARKET
        </Link>

        <div className="flex flex-col md:flex-row gap-6">
          <AssetThumb src={assetImageSrc(asAsset(asset))} alt={asset.name} size="lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="text-[10px] text-slate-600 tracking-widest">
              {asset.tcg_name ?? 'Pokémon'} · {ASSET_TYPE_LABELS[asset.asset_type]}
              {asset.set_name ? ` · ${asset.set_name}` : ''}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-wide text-white">{asset.name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl text-accent-light">
                {asset.price == null ? '—' : formatCurrency(asset.price)}
              </span>
              {asset.change_7d != null ? (
                <span className={`text-sm ${changeColor}`}>{formatPct(asset.change_7d)} 7D</span>
              ) : null}
              {asset.stale ? <span className="text-xs text-gold tracking-wider">STALE</span> : null}
            </div>
            {asset.condition ? (
              <div className="text-xs text-slate-500 tracking-wider">{asset.condition}</div>
            ) : null}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 md:p-6">
          <div className="text-[10px] text-slate-600 tracking-widest mb-2">PRICE HISTORY</div>
          <Sparkline points={history.map((p) => p.price)} />
        </div>

        {selected && asset.price != null ? (
          <TradeTicket
            assetId={asset.id}
            assetName={asset.name}
            tournamentId={selected.tournament.id}
            tournamentName={selected.tournament.name}
            price={asset.price}
            stale={asset.stale}
            cash={selected.portfolio.cash}
            ownedQty={ownedQty}
            tradingOpen={canTradeStatus(selected.tournament.status)}
          />
        ) : user && tradeable.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-sm text-slate-400">
            Join an active tournament to trade this asset.{' '}
            <Link href="/tournaments" className="text-accent-light">
              View tournaments
            </Link>
          </div>
        ) : !user ? (
          <Link
            href={`/auth/login?next=/assets/${asset.id}`}
            className="inline-flex min-h-12 items-center text-sm tracking-widest text-accent-light"
          >
            SIGN IN TO TRADE
          </Link>
        ) : null}

        {tradeable.length > 1 ? (
          <div className="text-xs text-slate-500 space-y-2">
            <div className="tracking-widest">TRADE IN</div>
            <div className="flex flex-wrap gap-2">
              {tradeable.map((b) => (
                <Link
                  key={b.tournament.id}
                  href={`/assets/${asset.id}?tournament=${b.tournament.id}`}
                  className={`min-h-11 inline-flex items-center px-3 rounded-xl border text-xs tracking-wider ${
                    selected?.tournament.id === b.tournament.id
                      ? 'border-accent/50 text-white'
                      : 'border-white/10 text-slate-400'
                  }`}
                >
                  {b.tournament.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
