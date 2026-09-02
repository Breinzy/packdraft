import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import HoldingsList, { type HoldingView } from '@/components/tournament/HoldingsList';
import TradeHistory from '@/components/tournament/TradeHistory';
import Sparkline from '@/components/market/Sparkline';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { getCurrentPrices } from '@/lib/market/prices';
import {
  CAREER_STARTING_CASH,
  ensureCareerPortfolio,
  getCareerHoldings,
  getCareerPortfolio,
  getCareerTransactions,
  getCareerValueHistory,
} from '@/lib/career/queries';
import { formatCurrency, formatReturn } from '@/lib/utils';
import { returnPct } from '@/lib/money';

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
  const trades = await getCareerTransactions(supabase, portfolio.id);
  const history = await getCareerValueHistory(supabase, portfolio.id);
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

        <Link href="/assets?book=career" className="btn btn-primary w-full md:w-auto min-h-12">
          Browse market
        </Link>

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
