import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import HoldingsList, { type HoldingView } from '@/components/tournament/HoldingsList';
import TradeHistory from '@/components/tournament/TradeHistory';
import Sparkline from '@/components/market/Sparkline';
import AchievementList from '@/components/player/AchievementList';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { getCurrentPrices } from '@/lib/market/prices';
import {
  CAREER_STARTING_CASH,
  ensureCareerPortfolio,
  getCareerHoldings,
  getCareerPeakValue,
  getCareerPortfolio,
  getCareerStandings,
  getCareerTransactions,
  getCareerValueHistory,
} from '@/lib/career/queries';
import { buildCareerProgression, formatMilestone } from '@/lib/career/progression';
import { formatCurrency, formatReturn } from '@/lib/utils';
import { returnPct } from '@/lib/money';
import type { HistoryTrade } from '@/lib/player/history';

export const dynamic = 'force-dynamic';

export default async function CareerPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="career">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Career</h1>
          <NeedsDatabase feature="Career Mode" />
        </main>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/career');

  const service = tryCreateServiceClient();
  if (service) {
    try {
      await ensureCareerPortfolio(service, user.id);
    } catch {
      // Fall through to a query; empty state if the RPC is not applied yet.
    }
  }

  let portfolio;
  try {
    portfolio = await getCareerPortfolio(supabase, user.id);
  } catch {
    return (
      <AppShell nav="career">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Career</h1>
          <QueryFailed feature="Career Mode" />
        </main>
      </AppShell>
    );
  }

  if (!portfolio) {
    return (
      <AppShell nav="career">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Career</h1>
          <p className="text-sm text-muted">
            Career Mode needs the Phase 12 migration. Apply{' '}
            <code className="text-foreground">20260902120000_phase12_career_mode.sql</code> on the
            Packdraft database, then reload.
          </p>
        </main>
      </AppShell>
    );
  }

  const holdingsRaw = await getCareerHoldings(supabase, portfolio.id);
  const trades = await getCareerTransactions(supabase, portfolio.id, 500);
  const history = await getCareerValueHistory(supabase, portfolio.id);
  const peakStored = await getCareerPeakValue(supabase, portfolio.id);
  const standings = await getCareerStandings(supabase).catch(() => []);
  const myRank = standings.find((row) => row.user_id === user.id)?.rank ?? null;
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

  const holdingsValue = holdings.reduce(
    (sum, h) => sum + h.quantity * (h.markPrice ?? 0),
    0
  );
  const portfolioValue = portfolio.cash + holdingsValue;
  const ret = returnPct(portfolioValue, portfolio.starting_cash || CAREER_STARTING_CASH);
  const historyTrades: HistoryTrade[] = trades.map((t) => ({
    id: t.id,
    portfolioId: t.portfolio_id,
    assetId: t.asset_id,
    assetName: t.asset_name ?? 'Asset',
    side: t.side,
    quantity: t.quantity,
    executionPrice: t.execution_price,
    totalValue: t.total_value,
    executedAt: t.executed_at,
  }));
  const progression = buildCareerProgression({
    cash: portfolio.cash,
    currentValue: portfolioValue,
    peakValue: peakStored,
    holdings: holdings.map((h) => ({
      assetType: h.asset?.asset_type ?? null,
      quantity: h.quantity,
      markPrice: h.markPrice,
    })),
    trades: historyTrades,
  });
  const chart = [
    ...history.map((p) => p.portfolio_value),
    ...(history.length === 0 || history[history.length - 1]?.portfolio_value !== portfolioValue
      ? [portfolioValue]
      : []),
  ];

  return (
    <AppShell nav="career">
      <main className="page py-6 md:py-8 space-y-6">
        <div>
          <h1 className="page-title text-2xl">Career</h1>
          <p className="text-sm text-muted mt-1.5">
            Persistent solo book. Starts at {formatCurrency(CAREER_STARTING_CASH)}. Separate from
            every tournament.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Value', value: formatCurrency(portfolioValue) },
            { label: 'Cash', value: formatCurrency(portfolio.cash) },
            { label: 'Holdings', value: formatCurrency(holdingsValue) },
            { label: 'Return', value: formatReturn(ret) },
            {
              label: 'Level',
              value: `Lv ${progression.level.level} ${progression.level.name}`,
            },
            { label: 'Archetype', value: progression.archetype.label },
            { label: 'Streak', value: `${progression.stats.streakDays}d` },
            {
              label: 'Career rank',
              value: myRank != null ? `#${myRank}` : '—',
            },
          ].map((stat) => (
            <div key={stat.label} className="panel px-4 py-3">
              <div className="kicker mb-1">{stat.label}</div>
              <div className="num text-base md:text-lg font-medium text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="panel p-4 md:p-5">
          <div className="section-title mb-3">Portfolio</div>
          <Sparkline points={chart} className="w-full h-24" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/assets?book=career" className="btn btn-primary w-full md:w-auto min-h-12">
            Browse market
          </Link>
          <Link href="/career/leaderboard" className="btn btn-ghost w-full md:w-auto min-h-12">
            Career ranks
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className="section-title">Milestones</h2>
          <p className="text-sm text-muted">
            {progression.level.nextAt
              ? `Next: ${progression.level.nextName} at ${formatMilestone(progression.level.nextAt)}.`
              : 'Legend cap reached.'}
            {' '}
            {progression.archetype.reason}
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {progression.milestones.map((row) => (
              <li
                key={row.value}
                className={`px-4 py-3 text-sm rounded-[10px] border ${
                  row.earned
                    ? 'border-accent/40 bg-accent-dim text-foreground'
                    : 'border-border bg-surface text-faint'
                }`}
              >
                {row.earned ? '● ' : '○ '}
                {row.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="section-title">Challenges</h2>
          <AchievementList achievements={progression.challenges} />
        </section>

        <section className="space-y-3">
          <h2 className="section-title">Badges</h2>
          <AchievementList achievements={progression.achievements} />
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Trades', value: String(progression.stats.tradeCount) },
            { label: 'Peak', value: formatCurrency(progression.stats.peakValue) },
            { label: 'Realized P&L', value: formatCurrency(progression.stats.realizedPnl) },
            { label: 'Assets held', value: String(progression.stats.distinctAssets) },
          ].map((stat) => (
            <div key={stat.label} className="panel px-4 py-3">
              <div className="kicker mb-1">{stat.label}</div>
              <div className="num text-base font-medium text-foreground">{stat.value}</div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="section-title">Holdings</h2>
          <HoldingsList
            holdings={holdings}
            hrefFor={(assetId) => `/assets/${assetId}?book=career`}
            empty="No holdings yet. Buy from the market with Career cash."
          />
        </section>

        <section className="space-y-3">
          <h2 className="section-title">Trade history</h2>
          <TradeHistory trades={trades} />
        </section>
      </main>
    </AppShell>
  );
}
