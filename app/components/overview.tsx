'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { usePortfolio, portfolioValueSeries } from '@/lib/store'
import { assets } from '@/lib/data'
import { PriceChart, AllocationDonut } from '@/components/charts'
import { AssetToken, ChangeBadge, Panel, SectionHead } from '@/components/primitives'
import { AssetRow } from '@/components/asset-views'
import { formatUSD, formatSignedUSD, formatPct, formatDateShort, trendClass, displayChange } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Overview() {
  const { positionViews, totals, positions, watch } = usePortfolio()

  const series = useMemo(() => portfolioValueSeries(positions), [positions])

  const setsTracked = useMemo(
    () => new Set(positionViews.map((v) => v.asset.setName)).size,
    [positionViews],
  )
  const singlesCount = useMemo(
    () => positionViews.filter((v) => v.asset.type === 'card').length,
    [positionViews],
  )
  const sealedCount = positionViews.length - singlesCount

  const topPerformers = useMemo(
    () => [...positionViews].sort((a, b) => b.returnPct - a.returnPct).slice(0, 3),
    [positionViews],
  )
  const losers = useMemo(
    () => [...positionViews].sort((a, b) => a.returnPct - b.returnPct).slice(0, 3),
    [positionViews],
  )
  const recentlyAdded = useMemo(
    () =>
      [...positionViews]
        .sort((a, b) => +new Date(b.purchaseDate) - +new Date(a.purchaseDate))
        .slice(0, 4),
    [positionViews],
  )
  const marketMovers = useMemo(
    () => [...assets].sort((a, b) => Math.abs(displayChange(b)) - Math.abs(displayChange(a))).slice(0, 5),
    [],
  )
  const watchActivity = useMemo(
    () =>
      watch
        .map((w) => assets.find((a) => a.id === w.assetId)!)
        .filter(Boolean)
        .sort((a, b) => Math.abs(displayChange(b)) - Math.abs(displayChange(a)))
        .slice(0, 4),
    [watch],
  )

  const allocData = [
    { label: 'Singles', value: totals.singlesValue, color: 'var(--color-primary)' },
    { label: 'Sealed', value: totals.sealedValue, color: 'var(--color-warning)' },
  ]
  const singlesPct = totals.value > 0 ? (totals.singlesValue / totals.value) * 100 : 0

  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" padded={false}>
          <div className="flex flex-wrap items-start justify-between gap-4 p-4 pb-0 sm:p-5 sm:pb-0">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Collection value
              </span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="tabular text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {formatUSD(totals.value, { cents: true })}
                </span>
                <ChangeBadge value={totals.totalReturnPct} size="md" />
              </div>
              <p className={cn('tabular mt-1 text-sm font-medium', trendClass(totals.todayMove))}>
                {formatSignedUSD(totals.todayMove)} today
                <span className="text-muted-foreground"> · {formatPct(totals.todayMovePct)}</span>
              </p>
            </div>
          </div>
          <PriceChart history={series} className="px-2 pb-2 pt-2 sm:px-3" height={240} defaultRange="3M" />
          <div className="grid grid-cols-2 gap-4 border-t border-border p-4 sm:grid-cols-4 sm:p-5">
            <HeroStat label="Cost basis" value={formatUSD(totals.costBasis)} />
            <HeroStat
              label="Total return"
              value={formatSignedUSD(totals.totalReturn)}
              valueClass={trendClass(totals.totalReturn)}
            />
            <HeroStat
              label="Today"
              value={formatSignedUSD(totals.todayMove)}
              valueClass={trendClass(totals.todayMove)}
            />
            <HeroStat label="Holdings" value={String(positionViews.length)} />
          </div>
        </Panel>

        {/* Allocation + composition */}
        <div className="grid gap-5">
          <Panel>
            <SectionHead title="Allocation" action="Portfolio" href="/portfolio" />
            <div className="flex items-center gap-4">
              <AllocationDonut data={allocData} size={128} />
              <div className="flex-1 space-y-3">
                <AllocRow
                  color="var(--color-primary)"
                  label="Singles"
                  pct={singlesPct}
                  value={totals.singlesValue}
                />
                <AllocRow
                  color="var(--color-warning)"
                  label="Sealed"
                  pct={100 - singlesPct}
                  value={totals.sealedValue}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
              <CompCell label="Singles" value={String(singlesCount)} />
              <CompCell label="Sealed" value={String(sealedCount)} />
              <CompCell label="Sets" value={String(setsTracked)} />
            </div>
          </Panel>
        </div>
      </div>

      {/* Performers / Losers */}
      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <SectionHead title="Top performers" />
          <div className="space-y-1">
            {topPerformers.map((v) => (
              <MoverRow key={v.assetId} view={v} />
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionHead title="Biggest losers" />
          <div className="space-y-1">
            {losers.map((v) => (
              <MoverRow key={v.assetId} view={v} />
            ))}
          </div>
        </Panel>
      </div>

      {/* Market + recent + watch */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionHead title="Pokemon market movers" action="Explore market" href="/market" />
          <div className="-mx-1">
            {marketMovers.map((a, i) => (
              <AssetRow key={a.id} asset={a} rank={i + 1} />
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionHead title="Recently added" action="All" href="/portfolio" />
            <div className="space-y-3">
              {recentlyAdded.map((v) => (
                <Link key={v.assetId} href={`/asset/${v.assetId}`} className="flex items-center gap-3 group">
                  <AssetToken asset={v.asset} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{v.asset.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateShort(v.purchaseDate)}</p>
                  </div>
                  <span className="tabular text-sm font-semibold text-foreground">
                    {formatUSD(v.marketValue)}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHead title="Watchlist activity" action="Watchlist" href="/watchlist" />
            <div className="space-y-3">
              {watchActivity.map((a) => (
                <Link key={a.id} href={`/asset/${a.id}`} className="flex items-center gap-3">
                  <AssetToken asset={a} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.setName}</p>
                  </div>
                  <ChangeBadge value={a.change24h} size="sm" />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function HeroStat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('tabular mt-0.5 text-lg font-semibold text-foreground', valueClass)}>{value}</p>
    </div>
  )
}

function CompCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-card py-3">
      <span className="tabular text-lg font-semibold text-foreground">{value}</span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function AllocRow({ color, label, pct, value }: { color: string; label: string; pct: number; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tabular text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>
      <p className="tabular mt-0.5 pl-4.5 text-xs text-muted-foreground">{formatUSD(value)}</p>
    </div>
  )
}

function MoverRow({ view }: { view: ReturnType<typeof usePortfolio>['positionViews'][number] }) {
  const up = view.gain >= 0
  return (
    <Link
      href={`/asset/${view.assetId}`}
      className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-card-elevated"
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg',
          up ? 'bg-positive-muted text-positive' : 'bg-negative-muted text-negative',
        )}
      >
        {up ? <ArrowUpRight className="size-4" strokeWidth={2.5} /> : <ArrowDownRight className="size-4" strokeWidth={2.5} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{view.asset.name}</p>
        <p className="truncate text-xs text-muted-foreground">{view.asset.setName}</p>
      </div>
      <div className="flex flex-col items-end">
        <span className="tabular text-sm font-semibold text-foreground">{formatUSD(view.marketValue)}</span>
        <span className={cn('tabular text-xs font-semibold', trendClass(view.gain))}>{formatPct(view.returnPct)}</span>
      </div>
    </Link>
  )
}
