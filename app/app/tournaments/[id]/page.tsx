import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/tournament/StatusBadge';
import JoinButton from '@/components/tournament/JoinButton';
import HoldingsList, { type HoldingView } from '@/components/tournament/HoldingsList';
import LeaderboardList from '@/components/tournament/LeaderboardList';
import TradeHistory from '@/components/tournament/TradeHistory';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import {
  getHoldings,
  getStandings,
  getTournament,
  getTransactions,
  getUserPortfolio,
  tickTournaments,
} from '@/lib/tournament/queries';
import { getCurrentPrices } from '@/lib/market/prices';
import { canJoinStatus, canTradeStatus, isSettledStatus, TOURNAMENT_STATUS_HELP } from '@/lib/tournament/lifecycle';
import { formatCountdown, formatCurrency, formatReturn } from '@/lib/utils';
import { returnPct } from '@/lib/money';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import type { TournamentPortfolio, TournamentStanding } from '@/types';

export const dynamic = 'force-dynamic';

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-6">
          <h1 className="page-title text-2xl">Tournament</h1>
          <NeedsDatabase feature="This tournament" />
        </main>
      </AppShell>
    );
  }
  const service = tryCreateServiceClient();
  if (service) {
    try {
      await tickTournaments(service);
    } catch {
      // continue with stored rows
    }
  }

  let tournament;
  try {
    tournament = await getTournament(supabase, id);
  } catch {
    return (
      <AppShell nav="play">
        <main className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-6">
          <h1 className="page-title text-2xl">Tournament</h1>
          <QueryFailed feature="this tournament" />
        </main>
      </AppShell>
    );
  }
  if (!tournament) notFound();

  let user = null;
  try {
    const auth = await supabase.auth.getUser();
    user = auth.data.user;
  } catch {
    user = null;
  }

  let standings: TournamentStanding[] = [];
  let portfolio: TournamentPortfolio | null = null;
  try {
    [standings, portfolio] = await Promise.all([
      getStandings(supabase, id),
      user ? getUserPortfolio(supabase, id, user.id) : Promise.resolve(null),
    ]);
  } catch {
    standings = [];
    portfolio = null;
  }

  const myStanding = user ? standings.find((s) => s.user_id === user.id) : undefined;
  const holdingsRaw = portfolio ? await getHoldings(supabase, portfolio.id) : [];
  const trades = portfolio ? await getTransactions(supabase, portfolio.id) : [];
  const prices = await getCurrentPrices(
    supabase,
    holdingsRaw.map((h) => h.asset_id)
  );

  const holdings: HoldingView[] = holdingsRaw.map((h) => ({
    assetId: h.asset_id,
    quantity: h.quantity,
    averageCost: h.average_cost,
    markPrice: prices.get(h.asset_id)?.price ?? null,
    asset: h.asset,
  }));

  // After settlement, mark holdings with frozen prices from standings math isn't per-asset.
  // Use settlement_prices when completed so the holdings table matches locked results.
  if (isSettledStatus(tournament.status) && holdingsRaw.length > 0) {
    const { data: frozen } = await supabase
      .from('tournament_settlement_prices')
      .select('asset_id, price')
      .eq('tournament_id', id);
    const map = new Map((frozen ?? []).map((r) => [r.asset_id as string, Number(r.price)]));
    for (const h of holdings) {
      const p = map.get(h.assetId);
      if (p != null) h.markPrice = p;
    }
  }

  const holdingsValue = holdings.reduce(
    (sum, h) => sum + h.quantity * (h.markPrice ?? 0),
    0
  );
  const portfolioValue = portfolio ? portfolio.cash + holdingsValue : tournament.starting_budget;
  const ret = portfolio ? returnPct(portfolioValue, portfolio.starting_cash) : 0;

  return (
    <AppShell nav="play">
      <main className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-8">
        <Link href="/tournaments" className="text-sm text-muted min-h-11 inline-flex items-center">
          ← Play
        </Link>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title text-3xl md:text-5xl">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
          {tournament.description ? (
            <p className="text-sm text-muted">{tournament.description}</p>
          ) : null}
          <p className="text-sm text-muted">{TOURNAMENT_STATUS_HELP[tournament.status]}</p>
          <div className="text-xs text-muted">
            {tournament.status === 'upcoming' && `Starts ${formatCountdown(tournament.starts_at)}`}
            {tournament.status === 'active' && `Trading closes ${formatCountdown(tournament.trading_closes_at)}`}
            {isSettledStatus(tournament.status) && 'Results locked'}
          </div>
        </div>

        {portfolio ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Value', value: formatCurrency(portfolioValue), color: 'var(--color-foreground)' },
              { label: 'Cash', value: formatCurrency(portfolio.cash), color: 'var(--color-muted)' },
              { label: 'Holdings', value: formatCurrency(holdingsValue), color: 'var(--color-muted)' },
              { label: 'Return', value: formatReturn(ret), color: ret >= 0 ? 'var(--color-green)' : 'var(--color-red)' },
              { label: 'Rank', value: myStanding ? `#${myStanding.rank}` : '—', color: 'var(--color-gold)' },
            ].map((stat) => (
              <div key={stat.label} className="panel px-4 py-3">
                <div className="kicker mb-1">{stat.label}</div>
                <div className="num text-base md:text-lg font-medium" style={{ color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        ) : canJoinStatus(tournament.status) ? (
          <JoinButton tournamentId={tournament.id} />
        ) : (
          <p className="text-sm text-muted">This tournament is no longer open to join.</p>
        )}

        {canTradeStatus(tournament.status) && portfolio ? (
          <Link
            href={`/assets?tournament=${tournament.id}`}
            className="btn btn-primary w-full md:w-auto min-h-12"
          >
            Browse market
          </Link>
        ) : null}

        <section className="space-y-3">
          <h2 className="kicker">Leaderboard</h2>
          {standings[0]?.frozen ? (
            <p className="text-xs text-gold">Final — will not change</p>
          ) : tournament.status === 'locked' || tournament.status === 'settling' ? (
            <p className="text-xs text-gold">Trading closed — values use prices as of close</p>
          ) : (
            <p className="text-xs text-faint">Live during the tournament</p>
          )}
          <LeaderboardList standings={standings} userId={user?.id} />
        </section>

        {portfolio ? (
          <>
            <section className="space-y-3">
              <h2 className="kicker">Holdings</h2>
              <HoldingsList holdings={holdings} tournamentId={tournament.id} />
            </section>
            <section className="space-y-3">
              <h2 className="kicker">Trade history</h2>
              <TradeHistory trades={trades} />
            </section>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}
