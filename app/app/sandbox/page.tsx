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
import { careerChartLimit, isPro } from '@/lib/auth/pro';

export const dynamic = 'force-dynamic';

export default async function SandboxPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="sandbox">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Sandbox</h1>
          <NeedsDatabase feature="Sandbox" />
        </main>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/sandbox');

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
      <AppShell nav="sandbox">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Sandbox</h1>
          <QueryFailed feature="Sandbox" />
        </main>
      </AppShell>
    );
  }

  if (!portfolio) {
    return (
      <AppShell nav="sandbox">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Sandbox</h1>
          <p className="text-sm text-muted">
            Sandbox needs the Phase 12 career migration. Apply{' '}
            <code className="text-foreground">20260902120000_phase12_career_mode.sql</code> on the
            Packdraft database, then reload.
          </p>
        </main>
      </AppShell>
    );
  }

  const holdingsRaw = await getCareerHoldings(supabase, portfolio.id);
  const trades = await getCareerTransactions(supabase, portfolio.id, 500);
  const { data: careerProfile } = await supabase
    .from('profiles')
    .select('pro_until')
    .eq('id', user.id)
    .maybeSingle();
  const pro = isPro(careerProfile?.pro_until as string | null | undefined);
  const history = await getCareerValueHistory(supabase, portfolio.id, careerChartLimit(pro));
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
    <AppShell nav="sandbox">
      <main className="page py-6 md:py-8 space-y-6">
        <section className="panel-elevated p-5 md:p-6">
          <p className="label-caps">Sandbox value</p>
          <p className="metric mt-2">{formatCurrency(portfolioValue)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className={ret >= 0 ? 'text-green' : 'text-red'}>{formatReturn(ret)}</span>
            <span>Virtual {formatCurrency(CAREER_STARTING_CASH)} book. Isolated from your collection and every tournament.</span>
          </div>
          <div className="mt-5">
            <Sparkline points={chart} className="w-full h-28 md:h-36" variant="brand" />
          </div>
          <p className="text-[11px] text-faint mt-2">
            {pro
              ? 'Pro chart window. Pro does not change Sandbox cash, trades, or ranks.'
              : 'Free chart window. Pro extends history only.'}
          </p>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Cash', value: formatCurrency(portfolio.cash) },
            { label: 'Holdings', value: formatCurrency(holdingsValue) },
            { label: 'Level', value: `Lv ${progression.level.level} ${progression.level.name}` },
            { label: 'Sandbox rank', value: myRank != null ? `#${myRank}` : '—' },
            { label: 'Archetype', value: progression.archetype.label },
            { label: 'Streak', value: `${progression.stats.streakDays}d` },
            { label: 'Peak', value: formatCurrency(progression.stats.peakValue) },
            { label: 'Trades', value: String(progression.stats.tradeCount) },
          ].map((stat) => (
            <div key={stat.label} className="panel px-4 py-3">
              <div className="label-caps mb-1">{stat.label}</div>
              <div className="num text-base md:text-lg font-semibold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/market?book=career" className="btn btn-primary w-full md:w-auto min-h-12">
            Browse market
          </Link>
          <Link href="/sandbox/leaderboard" className="btn btn-ghost w-full md:w-auto min-h-12">
            Sandbox ranks
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

        <section className="grid grid-cols-2 gap-3">
          {[
            { label: 'Realized P&L', value: formatCurrency(progression.stats.realizedPnl) },
            { label: 'Assets held', value: String(progression.stats.distinctAssets) },
          ].map((stat) => (
            <div key={stat.label} className="panel px-4 py-3">
              <div className="label-caps mb-1">{stat.label}</div>
              <div className="num text-base font-semibold text-foreground">{stat.value}</div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="section-title">Holdings</h2>
          <HoldingsList
            holdings={holdings}
            hrefFor={(assetId) => `/assets/${assetId}?book=career`}
            empty="No holdings yet. Buy from the market with Sandbox cash."
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
