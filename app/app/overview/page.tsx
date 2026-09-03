import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import AppShell from '@/components/layout/AppShell';
import type { Profile } from '@/types';
import { getStandings, getTransactions, getUserActiveBooks } from '@/lib/tournament/queries';
import { canTradeStatus } from '@/lib/tournament/lifecycle';
import AdSlot from '@/components/ads/AdSlot';
import { isPro, careerChartLimit } from '@/lib/auth/pro';
import { getCurrentPrices } from '@/lib/market/prices';
import { searchCatalog } from '@/lib/market/catalog';
import { listMarketEvents } from '@/lib/events/queries';
import {
  CAREER_STARTING_CASH,
  ensureCareerPortfolio,
  getCareerHoldings,
  getCareerPortfolio,
  getCareerStandings,
  getCareerTransactions,
  getCareerValueHistory,
} from '@/lib/career/queries';
import { formatCurrency } from '@/lib/utils';
import { returnPct } from '@/lib/money';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Delta } from '@/components/ui/delta';
import TournamentCard from '@/components/tournament/TournamentCard';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import AssetCard from '@/components/market/AssetCard';
import PortfolioChart from '@/components/charts/AreaChart';
import {
  ActivityList,
  LeaderboardPreview,
  formatActivityDetail,
  type LeaderRow,
} from '@/components/ui/leaderboard-preview';
import {
  COLLECTION_PATH,
  MARKET_PATH,
  PREDICTIONS_PATH,
  SANDBOX_PATH,
  TOURNAMENTS_PATH,
  WATCHLIST_PATH,
} from '@/lib/product/paths';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/overview');

  let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (!profile) {
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Player';

    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        display_name: displayName,
        display_name_set: false,
      })
      .select()
      .single();

    profile = created;
  }

  if (profile && !profile.display_name_set) {
    redirect('/auth/onboarding');
  }

  const typed = profile as Profile;
  const pro = isPro(typed.pro_until);

  const service = tryCreateServiceClient();
  if (service) {
    try {
      await ensureCareerPortfolio(service, user.id);
    } catch {
      // Sandbox migration may not be applied yet.
    }
  }

  const career = await getCareerPortfolio(supabase, user.id).catch(() => null);
  const books = await getUserActiveBooks(supabase, user.id).catch(() => []);
  const liveBooks = books.filter(
    (b) => canTradeStatus(b.tournament.status) || b.tournament.status === 'upcoming'
  );
  const featuredBook = liveBooks[0] ?? books[0] ?? null;

  let holdingsValue = 0;
  let cash = career?.cash ?? 0;
  let starting = career?.starting_cash ?? CAREER_STARTING_CASH;
  let history: { at: string; value: number }[] = [];
  let careerTrades: Awaited<ReturnType<typeof getCareerTransactions>> = [];
  let careerStandings: Awaited<ReturnType<typeof getCareerStandings>> = [];

  if (career) {
    const holdingsRaw = await getCareerHoldings(supabase, career.id).catch(() => []);
    const prices = await getCurrentPrices(
      supabase,
      holdingsRaw.map((h) => h.asset_id)
    );
    holdingsValue = holdingsRaw.reduce((sum, h) => sum + h.quantity * (prices.get(h.asset_id)?.price ?? 0), 0);
    cash = career.cash;
    starting = career.starting_cash || CAREER_STARTING_CASH;
    const snaps = await getCareerValueHistory(supabase, career.id, careerChartLimit(pro)).catch(() => []);
    history = snaps.map((p) => ({ at: p.recorded_at, value: p.portfolio_value }));
    careerTrades = await getCareerTransactions(supabase, career.id, 8).catch(() => []);
    careerStandings = await getCareerStandings(supabase).catch(() => []);
  }

  const sandboxValue = cash + holdingsValue;
  const sandboxReturnPct = returnPct(sandboxValue, starting);

  let leaderRows: LeaderRow[] = careerStandings.map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    rank: row.rank,
    portfolio_value: row.portfolio_value,
    return_pct: row.return_pct,
  }));
  let leaderHref = `${SANDBOX_PATH}/leaderboard`;

  if (featuredBook && canTradeStatus(featuredBook.tournament.status)) {
    const standings = await getStandings(supabase, featuredBook.tournament.id).catch(() => []);
    if (standings.length > 0) {
      leaderRows = standings.map((row) => ({
        user_id: row.user_id,
        display_name: row.display_name,
        rank: row.rank,
        portfolio_value: row.portfolio_value,
        return_pct: row.return_pct,
      }));
      leaderHref = `/tournaments/${featuredBook.tournament.id}`;
    }
  }

  let activity = careerTrades.map((tx) => ({
    id: tx.id,
    title: tx.asset_name ?? 'Asset',
    detail: formatActivityDetail(tx.side, tx.quantity, tx.total_value),
    at: tx.executed_at,
    side: tx.side,
  }));
  if (activity.length === 0 && featuredBook) {
    const txs = await getTransactions(supabase, featuredBook.portfolio.id, 8).catch(() => []);
    activity = txs.map((tx) => ({
      id: tx.id,
      title: tx.asset_name ?? 'Asset',
      detail: formatActivityDetail(tx.side, tx.quantity, tx.total_value),
      at: tx.executed_at,
      side: tx.side,
    }));
  }

  const events = await listMarketEvents(supabase).catch(() => []);
  const liveEvents = events.filter((e) => e.status === 'upcoming' || e.status === 'open').slice(0, 3);

  const catalog = await searchCatalog(supabase, { page: 1 }).catch(() => null);
  const movers = [...(catalog?.assets ?? [])]
    .filter((asset) => asset.change_7d != null)
    .sort((a, b) => Math.abs(b.change_7d ?? 0) - Math.abs(a.change_7d ?? 0))
    .slice(0, 4);

  const mySandboxRank = careerStandings.find((row) => row.user_id === user.id)?.rank ?? null;

  return (
    <AppShell>
      <main className="page py-6 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <section className="panel-elevated p-5 md:p-6">
              <p className="label-caps">Collection value</p>
              <p className="metric mt-2">—</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                Record the Pokémon you own — quantity, purchase price, and date — and Packdraft will
                mark it to live market data. Collection tracking is not live yet. This is not your
                Sandbox book.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link href={COLLECTION_PATH} className="btn btn-primary min-h-11">
                  Open portfolio
                </Link>
                <Link href={MARKET_PATH} className="btn btn-ghost min-h-11">
                  Browse market
                </Link>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricCard
                label="Watchlist"
                value="0"
                hint="Alerts come next"
                icon="bell"
              />
              <MetricCard
                label="Sandbox book"
                value={formatCurrency(sandboxValue)}
                deltaPct={sandboxReturnPct}
                hint="Virtual $1,000. Not your collection."
                icon="wallet"
              />
              <MetricCard
                label="Sandbox rank"
                value={mySandboxRank != null ? `#${mySandboxRank}` : '—'}
                hint="Marked virtual books only"
                icon="chart"
              />
            </div>

            <section className="panel p-5 md:p-6">
              <SectionHeader title="Sandbox" href={SANDBOX_PATH} actionLabel="Open" />
              <p className="mt-1 text-sm text-muted">
                Practice with virtual cash against Packdraft prices. Isolated from tournaments and
                from the collection tracker.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="metric text-3xl">{formatCurrency(sandboxValue)}</span>
                <Delta pct={sandboxReturnPct} />
              </div>
              <div className="mt-4">
                <PortfolioChart series={history} currentValue={sandboxValue} />
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Tournaments" href={TOURNAMENTS_PATH} actionLabel="All" />
              {featuredBook ? (
                <TournamentCard
                  tournament={featuredBook.tournament}
                  href={`/tournaments/${featuredBook.tournament.id}`}
                  cash={featuredBook.portfolio.cash}
                />
              ) : (
                <EmptyState
                  title="No tournament book yet"
                  description="Join an event for an isolated virtual budget. Collection and Sandbox cash stay separate."
                  action={
                    <Link href={TOURNAMENTS_PATH} className="btn btn-primary">
                      Find a tournament
                    </Link>
                  }
                />
              )}
            </section>

            {movers.length > 0 ? (
              <section className="space-y-3">
                <SectionHeader title="From the catalog" href={MARKET_PATH} actionLabel="Market" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {movers.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="panel p-4 md:p-5">
              <SectionHeader title="Watchlist" href={WATCHLIST_PATH} />
              <p className="mt-3 text-sm leading-6 text-muted">
                Saved assets and alerts are not stored yet. Use Market to research prices in the
                meantime.
              </p>
              <Link href={MARKET_PATH} className="btn btn-ghost mt-4 min-h-11 w-full">
                Research assets
              </Link>
            </section>

            <section className="panel p-4 md:p-5">
              <SectionHeader title="Predictions" href={PREDICTIONS_PATH} />
              <div className="mt-3 space-y-2">
                {liveEvents.length === 0 ? (
                  <p className="text-sm text-muted">No open prediction events right now.</p>
                ) : (
                  liveEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="block rounded-[var(--radius-md)] border border-border px-3 py-2.5 hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{event.name}</span>
                        <EventStatusBadge status={event.status} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="panel p-4 md:p-5">
              <SectionHeader title="Leaderboard" href={leaderHref} />
              <div className="mt-4">
                <LeaderboardPreview rows={leaderRows} userId={user.id} />
              </div>
            </section>
            <section className="panel p-4 md:p-5">
              <SectionHeader title="Recent activity" href={career ? SANDBOX_PATH : TOURNAMENTS_PATH} />
              <div className="mt-2">
                <ActivityList items={activity} />
              </div>
            </section>
            <AdSlot hidden={pro} />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
