import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/tournament/StatusBadge';
import JoinButton from '@/components/tournament/JoinButton';
import HoldingsList, { type HoldingView } from '@/components/tournament/HoldingsList';
import LeaderboardList from '@/components/tournament/LeaderboardList';
import TradeHistory from '@/components/tournament/TradeHistory';
import { createClient } from '@/lib/supabase/server';
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

export const dynamic = 'force-dynamic';

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const service = tryCreateServiceClient();
  if (service) {
    try {
      await tickTournaments(service);
    } catch {
      // continue with stored rows
    }
  }

  const tournament = await getTournament(supabase, id);
  if (!tournament) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [standings, portfolio] = await Promise.all([
    getStandings(supabase, id),
    user ? getUserPortfolio(supabase, id, user.id) : Promise.resolve(null),
  ]);

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
        <Link href="/tournaments" className="text-sm text-slate-500 tracking-wider min-h-11 inline-flex items-center">
          ← PLAY
        </Link>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-bold tracking-wide text-white">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
          {tournament.description ? (
            <p className="text-sm text-slate-400">{tournament.description}</p>
          ) : null}
          <p className="text-sm text-slate-500">{TOURNAMENT_STATUS_HELP[tournament.status]}</p>
          <div className="text-xs text-slate-500 tracking-wider">
            {tournament.status === 'upcoming' && `STARTS ${formatCountdown(tournament.starts_at)}`}
            {tournament.status === 'active' && `TRADING CLOSES ${formatCountdown(tournament.trading_closes_at)}`}
            {isSettledStatus(tournament.status) && 'RESULTS LOCKED'}
          </div>
        </div>

        {portfolio ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'VALUE', value: formatCurrency(portfolioValue), color: '#e2e8f0' },
              { label: 'CASH', value: formatCurrency(portfolio.cash), color: '#9fc0e6' },
              { label: 'HOLDINGS', value: formatCurrency(holdingsValue), color: '#9fc0e6' },
              { label: 'RETURN', value: formatReturn(ret), color: ret >= 0 ? '#34d399' : '#f87171' },
              { label: 'RANK', value: myStanding ? `#${myStanding.rank}` : '—', color: '#fbbf24' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                <div className="text-[10px] text-slate-600 tracking-widest mb-1">{stat.label}</div>
                <div className="text-base md:text-lg font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        ) : canJoinStatus(tournament.status) ? (
          <JoinButton tournamentId={tournament.id} />
        ) : (
          <p className="text-sm text-slate-500">This tournament is no longer open to join.</p>
        )}

        {canTradeStatus(tournament.status) && portfolio ? (
          <Link
            href={`/assets?tournament=${tournament.id}`}
            className="inline-flex items-center justify-center w-full md:w-auto min-h-12 px-6 rounded-2xl text-sm font-bold tracking-widest text-white"
            style={{ background: 'linear-gradient(135deg, #5b89bf, #4a78ae)' }}
          >
            BROWSE MARKET
          </Link>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-xs tracking-widest text-slate-600">LEADERBOARD</h2>
          {standings[0]?.frozen ? (
            <p className="text-xs text-gold tracking-wider">FINAL — will not change</p>
          ) : tournament.status === 'locked' || tournament.status === 'settling' ? (
            <p className="text-xs text-gold tracking-wider">Trading closed — values use prices as of close</p>
          ) : (
            <p className="text-xs text-slate-600 tracking-wider">Live during the tournament</p>
          )}
          <LeaderboardList standings={standings} userId={user?.id} />
        </section>

        {portfolio ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xs tracking-widest text-slate-600">HOLDINGS</h2>
              <HoldingsList holdings={holdings} tournamentId={tournament.id} />
            </section>
            <section className="space-y-3">
              <h2 className="text-xs tracking-widest text-slate-600">TRADE HISTORY</h2>
              <TradeHistory trades={trades} />
            </section>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}
