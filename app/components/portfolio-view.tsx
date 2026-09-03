'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, Plus, ArrowUpDown, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePortfolio, type PositionView } from '@/lib/store'
import { useUI } from '@/lib/ui'
import { AllocationDonut } from '@/components/charts'
import { AssetToken, ChangeBadge, Panel, TypePill } from '@/components/primitives'
import { formatUSD, formatSignedUSD, formatPct, formatDate, trendClass } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'card' | 'sealed'
type SortKey = 'value' | 'return' | 'gain' | 'name' | 'price'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'value', label: 'Market value' },
  { key: 'return', label: 'Return %' },
  { key: 'gain', label: 'Unrealized $' },
  { key: 'price', label: 'Price' },
  { key: 'name', label: 'Name' },
]

export function PortfolioView() {
  const { positionViews, totals, removePosition } = usePortfolio()
  const { openAdd, toast } = useUI()
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('value')
  const [sortMenu, setSortMenu] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = positionViews.filter((v) => (tab === 'all' ? true : v.asset.type === tab))
    if (q) list = list.filter((v) => `${v.asset.name} ${v.asset.setName} ${v.asset.subtitle}`.toLowerCase().includes(q))
    const sorted = [...list]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'return':
          return b.returnPct - a.returnPct
        case 'gain':
          return b.gain - a.gain
        case 'price':
          return b.unitPrice - a.unitPrice
        case 'name':
          return a.asset.name.localeCompare(b.asset.name)
        default:
          return b.marketValue - a.marketValue
      }
    })
    return sorted
  }, [positionViews, tab, query, sort])

  const singlesPct = totals.value > 0 ? (totals.singlesValue / totals.value) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Market value" value={formatUSD(totals.value, { cents: true })} />
        <SummaryTile label="Cost basis" value={formatUSD(totals.costBasis, { cents: true })} />
        <SummaryTile
          label="Unrealized gain"
          value={formatSignedUSD(totals.totalReturn)}
          badge={<ChangeBadge value={totals.totalReturnPct} />}
          valueClass={trendClass(totals.totalReturn)}
        />
        <SummaryTile
          label="Today"
          value={formatSignedUSD(totals.todayMove)}
          badge={<ChangeBadge value={totals.todayMovePct} />}
          valueClass={trendClass(totals.todayMove)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Panel padded={false} className="overflow-hidden">
          {/* Controls */}
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-border bg-secondary/60 p-1">
              {(['all', 'card', 'sealed'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors',
                    tab === t ? 'bg-card-elevated text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {t === 'card' ? 'Singles' : t === 'sealed' ? 'Sealed' : 'All'}
                </button>
              ))}
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search collection..."
                  className="h-9 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setSortMenu((v) => !v)}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong"
                >
                  <ArrowUpDown className="size-4 text-muted-foreground" />
                  <span className="hidden sm:inline">{SORTS.find((s) => s.key === sort)?.label}</span>
                </button>
                {sortMenu && (
                  <>
                    <button className="fixed inset-0 z-10" onClick={() => setSortMenu(false)} aria-hidden />
                    <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-border-strong bg-popover p-1 shadow-xl">
                      {SORTS.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => {
                            setSort(s.key)
                            setSortMenu(false)
                          }}
                          className={cn(
                            'flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors',
                            sort === s.key ? 'bg-primary-muted text-primary' : 'text-foreground hover:bg-secondary',
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Desktop table header */}
          <div className="hidden grid-cols-[minmax(0,1fr)_100px_120px_120px_100px] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Asset</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Market value</span>
            <span className="text-right">Cost basis</span>
            <span className="text-right">Return</span>
          </div>

          {rows.length === 0 ? (
            <EmptyState onAdd={() => openAdd()} query={query} />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((v) => (
                <PositionRow
                  key={v.assetId + (v.grade ?? '')}
                  view={v}
                  onEdit={() => openAdd(v.assetId)}
                  onRemove={() => {
                    removePosition(v.assetId)
                    toast({ title: 'Position removed', description: v.asset.name })
                  }}
                />
              ))}
            </ul>
          )}
        </Panel>

        {/* Allocation sidebar */}
        <div className="space-y-5">
          <Panel>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Allocation</h3>
            <div className="flex flex-col items-center gap-4">
              <AllocationDonut
                data={[
                  { label: 'Singles', value: totals.singlesValue, color: 'var(--color-primary)' },
                  { label: 'Sealed', value: totals.sealedValue, color: 'var(--color-warning)' },
                ]}
                size={150}
              />
              <div className="w-full space-y-2.5">
                <SideAlloc color="var(--color-primary)" label="Singles" pct={singlesPct} value={totals.singlesValue} />
                <SideAlloc color="var(--color-warning)" label="Sealed" pct={100 - singlesPct} value={totals.sealedValue} />
              </div>
            </div>
          </Panel>
          <Button onClick={() => openAdd()} className="w-full gap-1.5 rounded-xl font-semibold">
            <Plus className="size-4" strokeWidth={2.5} /> Add to collection
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  badge,
  valueClass,
}: {
  label: string
  value: string
  badge?: React.ReactNode
  valueClass?: string
}) {
  return (
    <Panel className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('tabular text-xl font-bold text-foreground', valueClass)}>{value}</span>
        {badge}
      </div>
    </Panel>
  )
}

function SideAlloc({ color, label, pct, value }: { color: string; label: string; pct: number; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 font-medium text-foreground">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tabular text-muted-foreground">
        {formatUSD(value)} · {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function PositionRow({
  view,
  onEdit,
  onRemove,
}: {
  view: PositionView
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <li className="group relative">
      {/* Mobile card */}
      <div className="flex flex-col gap-3 p-4 lg:hidden">
        <div className="flex items-center gap-3">
          <AssetToken asset={view.asset} size="sm" />
          <Link href={`/asset/${view.assetId}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">{view.asset.name}</span>
              <TypePill type={view.asset.type} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {view.grade && view.grade !== 'raw' ? view.grade.toUpperCase() + ' · ' : ''}
              {view.quantity}× · {view.asset.setName}
            </p>
          </Link>
          <div className="text-right">
            <p className="tabular text-sm font-bold text-foreground">{formatUSD(view.marketValue)}</p>
            <span className={cn('tabular text-xs font-semibold', trendClass(view.gain))}>{formatPct(view.returnPct)}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/50 p-2.5 text-xs">
          <MiniStat label="Cost" value={formatUSD(view.costBasis)} />
          <MiniStat label="Gain" value={formatSignedUSD(view.gain)} valueClass={trendClass(view.gain)} />
          <MiniStat label="24h" value={formatPct(view.asset.change24h)} valueClass={trendClass(view.asset.change24h)} />
        </div>
      </div>

      {/* Desktop row */}
      <div className="hidden grid-cols-[minmax(0,1fr)_100px_120px_120px_100px] items-center gap-4 px-4 py-3 transition-colors hover:bg-card-elevated lg:grid">
        <Link href={`/asset/${view.assetId}`} className="flex min-w-0 items-center gap-3">
          <AssetToken asset={view.asset} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">{view.asset.name}</span>
              <TypePill type={view.asset.type} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {view.grade && view.grade !== 'raw' ? view.grade.toUpperCase() + ' · ' : ''}
              {view.asset.subtitle} · {view.asset.setName} · {formatDate(view.purchaseDate)}
            </p>
          </div>
        </Link>
        <span className="tabular text-right text-sm text-foreground">{view.quantity}</span>
        <div className="text-right">
          <p className="tabular text-sm font-semibold text-foreground">{formatUSD(view.marketValue)}</p>
          <p className="tabular text-xs text-muted-foreground">{formatUSD(view.unitPrice)} ea</p>
        </div>
        <div className="text-right">
          <p className="tabular text-sm text-foreground">{formatUSD(view.costBasis)}</p>
          <p className="tabular text-xs text-muted-foreground">{formatUSD(view.costBasisPerUnit)} ea</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn('tabular text-sm font-semibold', trendClass(view.gain))}>{formatSignedUSD(view.gain)}</span>
          <ChangeBadge value={view.returnPct} size="sm" showIcon={false} />
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-3 hidden items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 lg:flex">
        <button
          onClick={onEdit}
          className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Edit holding"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors hover:text-negative"
          aria-label="Remove position"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  )
}

function MiniStat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('tabular font-semibold text-foreground', valueClass)}>{value}</p>
    </div>
  )
}

function EmptyState({ onAdd, query }: { onAdd: () => void; query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Search className="size-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {query ? `No positions matching "${query}"` : 'No positions yet'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {query ? 'Try a different search.' : 'Add your first card or sealed product to start tracking.'}
        </p>
      </div>
      {!query && (
        <Button onClick={onAdd} size="sm" className="mt-1 gap-1.5 rounded-xl font-semibold">
          <Plus className="size-4" strokeWidth={2.5} /> Add to collection
        </Button>
      )}
    </div>
  )
}
