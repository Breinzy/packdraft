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
import PortfolioChart from '@/components/charts/AreaChart';
import {
  ActivityList,
  LeaderboardPreview,
  formatActivityDetail,
  type LeaderRow,
} from '@/components/ui/leaderboard-preview';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

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
      // Career migration may not be applied yet.
    }
  }

  const career = await getCareerPortfolio(supabase, user.id).catch(() => null);
  const books = await getUserActiveBooks(supabase, user.id).catch(() => []);
  const liveBooks = books.filter(
    (b) => canTradeStatus(b.tournament.status) || b.tournament.status === 'upcoming'
  );
  const featuredBook = liveBooks[0] ?? books[0] ?? null;

  let holdingsValue = 0;
  let costBasis = 0;
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
    costBasis = holdingsRaw.reduce((sum, h) => sum + h.quantity * h.average_cost, 0);
    cash = career.cash;
    starting = career.starting_cash || CAREER_STARTING_CASH;
    const snaps = await getCareerValueHistory(supabase, career.id, careerChartLimit(pro)).catch(() => []);
    history = snaps.map((p) => ({ at: p.recorded_at, value: p.portfolio_value }));
    careerTrades = await getCareerTransactions(supabase, career.id, 8).catch(() => []);
    careerStandings = await getCareerStandings(supabase).catch(() => []);
  }

  const portfolioValue = cash + holdingsValue;
  const totalReturnPct = returnPct(portfolioValue, starting);
  const totalReturnAmt = portfolioValue - starting;
  const day = dayChange(history, portfolioValue);

  let leaderRows: LeaderRow[] = careerStandings.map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    rank: row.rank,
    portfolio_value: row.portfolio_value,
    return_pct: row.return_pct,
  }));
  let leaderHref = '/career/leaderboard';

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

  const myCareerRank = careerStandings.find((row) => row.user_id === user.id)?.rank ?? null;

  return (
    <AppShell nav="dashboard">
      <main className="page py-6 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <section className="panel-elevated p-5 md:p-6">
              <p className="label-caps">Total portfolio value</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <p className="metric">{formatCurrency(portfolioValue)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Delta pct={totalReturnPct} />
                <span className="text-sm text-muted">
                  {totalReturnAmt >= 0 ? '+' : ''}
                  {formatCurrency(totalReturnAmt)} total return
                  {myCareerRank != null ? ` · Rank #${myCareerRank}` : ''}
                </span>
              </div>
              <div className="mt-6">
                <PortfolioChart series={history} currentValue={portfolioValue} />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricCard
                label="Today's change"
                value={day ? formatCurrency(day.amount) : '—'}
                deltaPct={day?.pct}
                hint={day ? undefined : 'Needs a prior snapshot'}
                icon="chart"
              />
              <MetricCard
                label="Invested basis"
                value={formatCurrency(costBasis)}
                hint="Holdings cost"
                icon="link"
              />
              <MetricCard
                label="Buying power"
                value={formatCurrency(cash)}
                hint="Career cash available"
                icon="wallet"
              />
            </div>

            <section className="space-y-3">
              <SectionHeader title="Current tournament" href="/tournaments" actionLabel="All" />
              {featuredBook ? (
                <TournamentCard
                  tournament={featuredBook.tournament}
                  href={`/tournaments/${featuredBook.tournament.id}`}
                  cash={featuredBook.portfolio.cash}
                />
              ) : (
                <EmptyState
                  title="No tournament book yet"
                  description="Join an event to get an isolated virtual budget. Career cash stays separate."
                  action={
                    <Link href="/tournaments" className="btn btn-primary">
                      Find a tournament
                    </Link>
                  }
                />
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="panel p-4 md:p-5">
              <SectionHeader title="Leaderboard" href={leaderHref} />
              <div className="mt-4">
                <LeaderboardPreview rows={leaderRows} userId={user.id} />
              </div>
            </section>
            <section className="panel p-4 md:p-5">
              <SectionHeader title="Recent activity" href={career ? '/career' : '/tournaments'} />
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

function dayChange(
  history: { at: string; value: number }[],
  current: number
): { amount: number; pct: number } | null {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const startMs = start.getTime();
  const prior =
    [...history].reverse().find((p) => new Date(p.at).getTime() < startMs) ??
    (history.length >= 2 ? history[history.length - 2] : null);
  if (!prior || prior.value === 0) return null;
  const amount = current - prior.value;
  const pct = ((current - prior.value) / prior.value) * 100;
  return { amount, pct };
}
