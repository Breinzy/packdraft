'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getSet, assetsInSet } from '@/lib/data'
import { PriceChart } from '@/components/charts'
import { AssetCard, AssetRow } from '@/components/asset-views'
import { Panel, SectionHead, ChangeBadge } from '@/components/primitives'
import { formatUSD, formatDate, formatPct, trendClass } from '@/lib/format'
import { cn } from '@/lib/utils'

export function SetDetail({ setId }: { setId: string }) {
  const set = getSet(setId)
  const members = useMemo(() => (set ? assetsInSet(set.id) : []), [set])
  const cards = members.filter((m) => m.type === 'card')
  const sealed = members.filter((m) => m.type === 'sealed')
  const movers = useMemo(
    () => [...members].sort((a, b) => b.change24h - a.change24h),
    [members],
  )

  if (!set) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">Set not found.</p>
        <Link href="/sets" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Back to sets
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Link
        href="/sets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Sets
      </Link>

      {/* Header */}
      <Panel padded={false} className="overflow-hidden">
        <div
          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
          style={{
            background: `radial-gradient(90% 140% at 0% 0%, ${set.logoColor.replace(')', ' / 0.22)')}, transparent 60%)`,
          }}
        >
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-background shadow-lg"
            style={{ background: set.logoColor }}
          >
            {set.code}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expansion</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">{set.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDate(set.releasedAt)} · {set.cardCount} cards · {members.length} tracked assets
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Set index</p>
            <p className="tabular text-2xl font-bold text-foreground">{formatUSD(set.price)}</p>
            <div className="flex justify-end">
              <ChangeBadge value={set.change30d} size="md" />
            </div>
          </div>
        </div>
        <div className="border-t border-border p-4">
          <PriceChart history={set.history} defaultRange="6M" height={200} />
        </div>
      </Panel>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Cards tracked" value={String(cards.length)} />
        <StatTile label="Sealed tracked" value={String(sealed.length)} />
        <StatTile label="30d performance" value={formatPct(set.change30d)} valueClass={trendClass(set.change30d)} />
        <StatTile label="Released" value={formatDate(set.releasedAt)} />
      </div>

      {/* Top movers */}
      <Panel>
        <SectionHead title="Top movers" />
        <div className="-mx-1">
          {movers.slice(0, 5).map((a, i) => (
            <AssetRow key={a.id} asset={a} rank={i + 1} />
          ))}
        </div>
      </Panel>

      {/* Sealed products */}
      {sealed.length > 0 && (
        <div>
          <SectionHead title="Sealed products" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {sealed.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {cards.length > 0 && (
        <div>
          <SectionHead title="Cards" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {cards.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <Panel className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('tabular text-lg font-bold text-foreground', valueClass)}>{value}</span>
    </Panel>
  )
}
