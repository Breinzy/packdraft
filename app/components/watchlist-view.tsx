'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Star, Bell, BellOff, TrendingUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAsset } from '@/lib/data'
import { usePortfolio } from '@/lib/store'
import { useUI } from '@/lib/ui'
import { Sparkline } from '@/components/charts'
import { WatchButton } from '@/components/asset-views'
import { AssetToken, ChangeBadge, Panel, TypePill } from '@/components/primitives'
import { formatUSD, formatPct, formatDate, trendClass } from '@/lib/format'
import { cn } from '@/lib/utils'

export function WatchlistView() {
  const { watch, ownedFor } = usePortfolio()
  const { openSearch } = useUI()

  const items = useMemo(
    () =>
      watch
        .map((w) => ({ w, asset: getAsset(w.assetId)! }))
        .filter((x) => x.asset)
        .sort((a, b) => Math.abs(b.asset.change24h) - Math.abs(a.asset.change24h)),
    [watch],
  )

  if (items.length === 0) {
    return (
      <Panel className="flex flex-col items-center gap-3 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-warning-muted text-warning">
          <Star className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Your watchlist is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Track assets you&apos;re researching before you buy.</p>
        </div>
        <Button onClick={openSearch} size="sm" className="mt-1 gap-1.5 rounded-xl font-semibold">
          <Search className="size-4" /> Find assets
        </Button>
      </Panel>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(({ w, asset }) => {
        const owned = ownedFor(asset.id)
        const alert = w.alertAbove ?? w.alertBelow
        const alertDir = w.alertAbove ? 'above' : w.alertBelow ? 'below' : null
        return (
          <Panel key={asset.id} padded={false} className="overflow-hidden transition-colors hover:border-border-strong">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <Link href={`/asset/${asset.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <AssetToken asset={asset} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{asset.name}</span>
                    <TypePill type={asset.type} />
                    {owned && (
                      <span className="rounded bg-primary-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Owned
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {asset.subtitle} · {asset.setName} · Added {formatDate(w.addedAt)}
                  </p>
                </div>
              </Link>

              <div className="hidden w-28 shrink-0 md:block">
                <Sparkline data={asset.history.slice(-30)} />
              </div>

              {/* alert */}
              <div className="hidden w-36 shrink-0 sm:block">
                {alert ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Bell className="size-3.5 text-warning" />
                    <span className="text-muted-foreground">
                      Alert {alertDir} <span className="tabular font-semibold text-foreground">{formatUSD(alert)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                    <BellOff className="size-3.5" /> No alert
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="grid grid-cols-3 gap-4 sm:hidden">
                  <MobileMini label="24h" value={formatPct(asset.change24h)} cls={trendClass(asset.change24h)} />
                  <MobileMini label="7d" value={formatPct(asset.change7d)} cls={trendClass(asset.change7d)} />
                  <MobileMini label="30d" value={formatPct(asset.change30d)} cls={trendClass(asset.change30d)} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="tabular text-sm font-bold text-foreground">{formatUSD(asset.price)}</p>
                    <div className="flex justify-end">
                      <ChangeBadge value={asset.change24h} size="sm" />
                    </div>
                  </div>
                  <WatchButton assetId={asset.id} />
                </div>
              </div>
            </div>
          </Panel>
        )
      })}
    </div>
  )
}

function MobileMini({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('tabular text-xs font-semibold', cls)}>{value}</p>
    </div>
  )
}
