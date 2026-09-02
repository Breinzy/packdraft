import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import AssetThumb from '@/components/market/AssetThumb';
import Sparkline from '@/components/market/Sparkline';
import TradeTicket from '@/components/tournament/TradeTicket';
import { getCatalogAsset, asAsset } from '@/lib/market/catalog';
import { assetImageSrc } from '@/lib/market/images';
import { getPriceHistory } from '@/lib/market/prices';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { getUserActiveBooks, getUserPortfolio, getHoldings } from '@/lib/tournament/queries';
import { ensureCareerPortfolio, getCareerHoldings, getCareerPortfolio } from '@/lib/career/queries';
import { canTradeStatus } from '@/lib/tournament/lifecycle';
import { formatCurrency, formatPct } from '@/lib/utils';
import { ASSET_TYPE_LABELS } from '@/types';
import AdSlot from '@/components/ads/AdSlot';
import { isPro, priceHistoryLimit } from '@/lib/auth/pro';
import { tcgplayerProductUrl } from '@/lib/market/affiliate';
import { getTcgplayerAffiliate } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tournament?: string; book?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="market">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Asset</h1>
          <NeedsDatabase feature="Asset detail" />
        </main>
      </AppShell>
    );
  }
  let asset;
  try {
    asset = await getCatalogAsset(supabase, id);
  } catch {
    return (
      <AppShell nav="market">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Asset</h1>
          <QueryFailed feature="this asset" />
        </main>
      </AppShell>
    );
  }
  if (!asset) notFound();

  let user = null;
  try {
    const auth = await supabase.auth.getUser();
    user = auth.data.user;
  } catch {
    user = null;
  }

  let pro = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('pro_until')
      .eq('id', user.id)
      .maybeSingle();
    pro = isPro(profile?.pro_until as string | null | undefined);
  }

  const history = await getPriceHistory(supabase, id, { limit: priceHistoryLimit(pro) }).catch(() => []);

  const books = user ? await getUserActiveBooks(supabase, user.id).catch(() => []) : [];
  const tradeable = books.filter((b) => canTradeStatus(b.tournament.status));

  let career = user ? await getCareerPortfolio(supabase, user.id).catch(() => null) : null;
  if (user && !career) {
    const service = tryCreateServiceClient();
    if (service) {
      try {
        await ensureCareerPortfolio(service, user.id);
        career = await getCareerPortfolio(supabase, user.id);
      } catch {
        career = null;
      }
    }
  }

  const wantCareer = sp.book === 'career' || (!sp.tournament && !!career);
  const selectedTournament =
    !wantCareer
      ? tradeable.find((b) => b.tournament.id === sp.tournament) ?? tradeable[0] ?? null
      : tradeable.find((b) => b.tournament.id === sp.tournament) ?? null;
  const usingCareer = Boolean(career && (wantCareer || !selectedTournament));

  let ownedQty = 0;
  if (usingCareer && career) {
    const holdings = await getCareerHoldings(supabase, career.id).catch(() => []);
    ownedQty = holdings.find((h) => h.asset_id === asset.id)?.quantity ?? 0;
  } else if (selectedTournament) {
    const portfolio = await getUserPortfolio(
      supabase,
      selectedTournament.tournament.id,
      selectedTournament.portfolio.user_id
    );
    if (portfolio) {
      const holdings = await getHoldings(supabase, portfolio.id);
      ownedQty = holdings.find((h) => h.asset_id === asset.id)?.quantity ?? 0;
    }
  }

  const changeColor =
    (asset.change_7d ?? 0) > 0 ? 'text-green' : (asset.change_7d ?? 0) < 0 ? 'text-red' : 'text-muted';

  const venues = [
    ...(career
      ? [{ key: 'career', href: `/assets/${asset.id}?book=career`, label: 'Career', active: usingCareer }]
      : []),
    ...tradeable.map((b) => ({
      key: b.tournament.id,
      href: `/assets/${asset.id}?tournament=${b.tournament.id}`,
      label: b.tournament.name,
      active: !usingCareer && selectedTournament?.tournament.id === b.tournament.id,
    })),
  ];
  const shopUrl = tcgplayerProductUrl(asset.external_id, getTcgplayerAffiliate());

  return (
    <AppShell nav="market">
      <main className="page py-6 md:py-8 space-y-6">
        <Link href="/assets" className="text-sm text-muted min-h-11 inline-flex items-center">
          ← Market
        </Link>

        <div className="flex flex-col md:flex-row gap-6">
          <AssetThumb src={assetImageSrc(asAsset(asset))} alt={asset.name} size="lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="kicker">
              {asset.tcg_name ?? 'Pokémon'} · {ASSET_TYPE_LABELS[asset.asset_type]}
              {asset.set_name ? ` · ${asset.set_name}` : ''}
            </div>
            <h1 className="page-title text-2xl">{asset.name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="num text-2xl text-foreground">
                {asset.price == null ? '—' : formatCurrency(asset.price)}
              </span>
              {asset.change_7d != null ? (
                <span className={`text-sm ${changeColor}`}>{formatPct(asset.change_7d)} 7D</span>
              ) : null}
              {asset.price == null ? (
                <span className="kicker">No price</span>
              ) : asset.stale ? (
                <span className="kicker text-gold">Stale</span>
              ) : null}
            </div>
            {asset.condition ? (
              <div className="text-xs text-muted">{asset.condition}</div>
            ) : null}
            {shopUrl ? (
              <a
                href={shopUrl}
                className="inline-flex min-h-11 items-center text-sm text-accent-light"
                rel="noreferrer"
                target="_blank"
              >
                View on TCGPlayer
              </a>
            ) : null}
          </div>
        </div>

        <div className="panel p-4 md:p-6">
          <div className="section-title mb-3">Price history</div>
          <Sparkline points={history.map((p) => p.price)} className="h-28 w-full md:h-36" variant="brand" />
          <p className="text-[11px] text-faint mt-2">
            {pro ? 'Pro history window.' : 'Free history window. Pro extends this. It does not change prices or ranks.'}
          </p>
        </div>

        <AdSlot hidden={pro} />

        {usingCareer && career && asset.price != null ? (
          <TradeTicket
            assetId={asset.id}
            assetName={asset.name}
            bookName="Career"
            price={asset.price}
            stale={asset.stale}
            cash={career.cash}
            ownedQty={ownedQty}
            tradingOpen
            submitPath="/api/career/trade"
            loginNext={`/assets/${asset.id}?book=career`}
          />
        ) : selectedTournament && asset.price != null ? (
          <TradeTicket
            assetId={asset.id}
            assetName={asset.name}
            bookName={selectedTournament.tournament.name}
            price={asset.price}
            stale={asset.stale}
            cash={selectedTournament.portfolio.cash}
            ownedQty={ownedQty}
            tradingOpen={canTradeStatus(selectedTournament.tournament.status)}
            submitPath="/api/trade"
            extraBody={{ tournamentId: selectedTournament.tournament.id }}
            loginNext={`/assets/${asset.id}?tournament=${selectedTournament.tournament.id}`}
          />
        ) : (usingCareer || selectedTournament) && asset.price == null ? (
          <div className="panel p-5 text-sm text-muted">
            No Packdraft price for this asset yet. Trading needs a stored snapshot.
          </div>
        ) : user ? (
          <div className="panel p-5 text-sm text-muted">
            Open Career or join an active tournament to trade this asset.{' '}
            <Link href="/career" className="text-accent-light">
              Career
            </Link>
            {' · '}
            <Link href="/tournaments" className="text-accent-light">
              Play
            </Link>
          </div>
        ) : (
          <Link
            href={`/auth/login?next=/assets/${asset.id}`}
            className="inline-flex min-h-12 items-center text-sm text-accent-light"
          >
            Sign in to trade
          </Link>
        )}

        {venues.length > 1 ? (
          <div className="text-xs text-muted space-y-2">
            <div className="section-title">Trade in</div>
            <div className="flex flex-wrap gap-2">
              {venues.map((v) => (
                <Link
                  key={v.key}
                  href={v.href}
                  className={`min-h-11 inline-flex items-center px-3 rounded-md border text-xs ${
                    v.active
                      ? 'border-accent/50 text-foreground bg-accent-dim'
                      : 'border-border text-muted'
                  }`}
                >
                  {v.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
