'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import type { Asset } from '@/lib/data'
import { usePortfolio } from '@/lib/store'
import { AssetToken, ChangeBadge, TypePill } from '@/components/primitives'
import { Sparkline } from '@/components/charts'
import { formatUSD, formatCompactNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/* Compact watch button reused everywhere */
export function WatchButton({
  assetId,
  className,
  size = 'md',
}: {
  assetId: string
  className?: string
  size?: 'sm' | 'md'
}) {
  const { isWatched, toggleWatch } = usePortfolio()
  const watched = isWatched(assetId)
  return (
    <button
      type="button"
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={watched}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleWatch(assetId)
      }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border transition-colors',
        size === 'sm' ? 'size-8' : 'size-9',
        watched
          ? 'border-warning/40 bg-warning-muted text-warning'
          : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
        className,
      )}
    >
      <Star className={size === 'sm' ? 'size-4' : 'size-[18px]'} fill={watched ? 'currentColor' : 'none'} />
    </button>
  )
}

/* Row for tables/lists — collapses gracefully on mobile */
export function AssetRow({ asset, rank }: { asset: Asset; rank?: number }) {
  return (
    <Link
      href={`/asset/${asset.id}`}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-card-elevated sm:gap-4 sm:px-3"
    >
      {rank !== undefined && (
        <span className="tabular hidden w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground sm:block">
          {rank}
        </span>
      )}
      <AssetToken asset={asset} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{asset.name}</span>
          <TypePill type={asset.type} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {asset.subtitle} · {asset.setName}
        </p>
      </div>
      <div className="hidden w-24 shrink-0 md:block">
        <Sparkline data={asset.history.slice(-30)} className="h-8" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="tabular text-sm font-semibold text-foreground">{formatUSD(asset.price)}</span>
        <ChangeBadge value={asset.change24h} size="sm" />
      </div>
    </Link>
  )
}

/* Card tile for grids */
export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link
      href={`/asset/${asset.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:border-border-strong hover:bg-card-elevated"
    >
      <div className="flex items-start justify-between gap-2">
        <AssetToken asset={asset} size="md" />
        <WatchButton assetId={asset.id} size="sm" />
      </div>
      <div className="mt-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <TypePill type={asset.type} />
          <span className="truncate text-[11px] text-muted-foreground">{asset.setName}</span>
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{asset.name}</h3>
        <p className="truncate text-xs text-muted-foreground">{asset.subtitle}</p>
      </div>
      <div className="mt-3 -mx-1">
        <Sparkline data={asset.history.slice(-30)} className="h-9" />
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className="tabular text-base font-bold text-foreground">{formatUSD(asset.price)}</span>
        <ChangeBadge value={asset.change24h} />
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
        <span className="tabular">{formatCompactNumber(asset.watchers)} watching</span>
        <span className="tabular">Vol {formatCompactNumber(asset.volume)}</span>
      </div>
    </Link>
  )
}
