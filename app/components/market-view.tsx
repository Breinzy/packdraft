'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, Flame, TrendingUp, TrendingDown, Eye, Sparkles } from 'lucide-react'
import { assets, sets } from '@/lib/data'
import { useUI } from '@/lib/ui'
import { AssetCard, AssetRow } from '@/components/asset-views'
import { Panel, SectionHead, ChangeBadge } from '@/components/primitives'
import { formatUSD, formatDate, displayChange } from '@/lib/format'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'card' | 'sealed'

const RAILS = [
  { key: 'trending', label: 'Trending', icon: Flame },
  { key: 'gainers', label: 'Top gainers', icon: TrendingUp },
  { key: 'losers', label: 'Top losers', icon: TrendingDown },
  { key: 'watched', label: 'Most watched', icon: Eye },
  { key: 'new', label: 'New releases', icon: Sparkles },
] as const

export function MarketView() {
  const { openSearch } = useUI()
  const [filter, setFilter] = useState<Filter>('all')
  const [rail, setRail] = useState<(typeof RAILS)[number]['key']>('trending')

  const pool = useMemo(
    () => assets.filter((a) => (filter === 'all' ? true : a.type === filter)),
    [filter],
  )

  const railAssets = useMemo(() => {
    const arr = [...pool]
    switch (rail) {
      case 'gainers':
        return arr.sort((a, b) => displayChange(b) - displayChange(a)).slice(0, 8)
      case 'losers':
        return arr.sort((a, b) => displayChange(a) - displayChange(b)).slice(0, 8)
      case 'watched':
        return arr.sort((a, b) => b.watchers - a.watchers).slice(0, 8)
      case 'new':
        return arr.sort((a, b) => +new Date(b.releasedAt) - +new Date(a.releasedAt)).slice(0, 8)
      default:
        return arr.sort((a, b) => b.volume * Math.abs(b.change7d) - a.volume * Math.abs(a.change7d)).slice(0, 8)
    }
  }, [pool, rail])

  const popular = useMemo(() => [...pool].sort((a, b) => b.watchers - a.watchers).slice(0, 6), [pool])
  const moving = useMemo(
    () => [...pool].sort((a, b) => Math.abs(displayChange(b)) - Math.abs(displayChange(a))).slice(0, 8),
    [pool],
  )

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <button
        onClick={openSearch}
        className="flex h-12 w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong hover:bg-card-elevated"
      >
        <Search className="size-4.5" />
        <span className="flex-1">Search &ldquo;Charizard&rdquo;, &ldquo;Prismatic Evolutions&rdquo;, &ldquo;Booster Box&rdquo;...</span>
        <span className="hidden rounded-lg bg-secondary px-2 py-1 text-xs font-semibold sm:inline">Search</span>
      </button>

      {/* Filter + rail selectors */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-border bg-secondary/60 p-1">
          {(['all', 'card', 'sealed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors',
                filter === f ? 'bg-card-elevated text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {f === 'card' ? 'Cards' : f === 'sealed' ? 'Sealed' : 'All'}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {RAILS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRail(r.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                rail === r.key
                  ? 'border-primary/40 bg-primary-muted text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              <r.icon className="size-4" />
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rail grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {railAssets.map((a) => (
          <AssetCard key={a.id} asset={a} />
        ))}
      </div>

      {/* Two-column: recently moving + popular sets */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionHead title="Recently moving" />
          <div className="-mx-1">
            {moving.map((a, i) => (
              <AssetRow key={a.id} asset={a} rank={i + 1} />
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHead title="Popular sets" action="All sets" href="/sets" />
          <div className="space-y-1">
            {sets.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                href={`/sets/${s.id}`}
                className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-card-elevated"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-background"
                  style={{ background: s.logoColor }}
                >
                  {s.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatDate(s.releasedAt)}</p>
                </div>
                <ChangeBadge value={s.change30d} size="sm" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Popular assets grid */}
      <div>
        <SectionHead title="Most watched" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {popular.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      </div>
    </div>
  )
}
