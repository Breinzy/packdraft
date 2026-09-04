'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Search as SearchIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/ui'
import { usePortfolio } from '@/lib/store'
import { assets, getAsset, type AssetType, type GradeQuote } from '@/lib/data'
import { AssetToken, TypePill } from '@/components/primitives'
import { formatUSD, formatSignedUSD, formatPct, trendClass } from '@/lib/format'
import { cn } from '@/lib/utils'

export function AddPositionModal() {
  const { addOpen, addAssetId, closeAdd, toast } = useUI()
  const { addPosition, totals } = usePortfolio()

  const [type, setType] = useState<AssetType>('card')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [assetQuery, setAssetQuery] = useState('')
  const [grade, setGrade] = useState<GradeQuote['grade']>('raw')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const selected = selectedId ? getAsset(selectedId) : undefined

  useEffect(() => {
    if (addOpen) {
      const preset = addAssetId ? getAsset(addAssetId) : undefined
      if (preset) {
        setType(preset.type)
        setSelectedId(preset.id)
        setGrade(preset.grades ? 'raw' : 'raw')
        setPrice(String(preset.price))
      } else {
        setType('card')
        setSelectedId(null)
        setPrice('')
      }
      setAssetQuery('')
      setQty('1')
      setDate(new Date().toISOString().slice(0, 10))
    }
  }, [addOpen, addAssetId])

  const list = useMemo(() => {
    const q = assetQuery.trim().toLowerCase()
    return assets
      .filter((a) => a.type === type)
      .filter((a) => !q || `${a.name} ${a.subtitle} ${a.setName}`.toLowerCase().includes(q))
      .slice(0, 40)
  }, [type, assetQuery])

  const unitMarket = useMemo(() => {
    if (!selected) return 0
    if (selected.grades) return selected.grades.find((g) => g.grade === grade)?.price ?? selected.price
    return selected.price
  }, [selected, grade])

  const nQty = Math.max(0, Number(qty) || 0)
  const nPrice = Math.max(0, Number(price) || 0)
  const costBasis = nQty * nPrice
  const marketValue = nQty * unitMarket
  const gain = marketValue - costBasis
  const returnPct = costBasis > 0 ? (gain / costBasis) * 100 : 0
  const newTotal = totals.value + marketValue
  const allocation = newTotal > 0 ? (marketValue / newTotal) * 100 : 0

  const canSubmit = selected && nQty > 0 && nPrice > 0

  function submit() {
    if (!selected || !canSubmit) return
    addPosition({
      assetId: selected.id,
      quantity: nQty,
      costBasisPerUnit: Number(nPrice.toFixed(2)),
      purchaseDate: new Date(date).toISOString(),
      grade: selected.grades ? grade : undefined,
    })
    toast({
      title: 'Added to collection',
      description: `${nQty}× ${selected.name} at ${formatUSD(nPrice, { cents: true })}`,
      variant: 'positive',
    })
    closeAdd()
  }

  if (!addOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button aria-label="Close" onClick={closeAdd} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border-strong bg-popover shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Add to collection</h2>
            <p className="text-xs text-muted-foreground">Track a new card or sealed product</p>
          </div>
          <button
            onClick={closeAdd}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* type toggle */}
          <div className="mb-4 inline-flex w-full rounded-xl border border-border bg-secondary/60 p-1">
            {(['card', 'sealed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t)
                  setSelectedId(null)
                }}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors',
                  type === t ? 'bg-card-elevated text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {t === 'card' ? 'Single' : 'Sealed'}
              </button>
            ))}
          </div>

          {!selected ? (
            <div>
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
                <SearchIcon className="size-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={assetQuery}
                  onChange={(e) => setAssetQuery(e.target.value)}
                  placeholder={`Find a ${type === 'card' ? 'card' : 'sealed product'}...`}
                  className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="-mx-1 max-h-64 overflow-y-auto px-1">
                {list.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedId(a.id)
                      setGrade('raw')
                      setPrice(String(a.price))
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary"
                  >
                    <AssetToken asset={a} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.subtitle} · {a.setName}</p>
                    </div>
                    <span className="tabular text-sm font-semibold text-foreground">{formatUSD(a.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* selected asset */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <AssetToken asset={selected} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{selected.name}</p>
                    <TypePill type={selected.type} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{selected.subtitle} · {selected.setName}</p>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Change
                </button>
              </div>

              {/* grade */}
              {selected.grades && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Grade</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {selected.grades.map((g) => (
                      <button
                        key={g.grade}
                        onClick={() => {
                          setGrade(g.grade)
                          setPrice(String(g.price))
                        }}
                        className={cn(
                          'rounded-lg border py-2 text-xs font-semibold transition-colors',
                          grade === g.grade
                            ? 'border-primary bg-primary-muted text-primary'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {g.grade === 'raw' ? 'Raw' : g.grade.toUpperCase().replace('PSA', 'PSA ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="add-input"
                  />
                </Field>
                <Field label="Purchase price (each)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="add-input"
                  />
                </Field>
              </div>

              <Field label="Purchase date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="add-input" />
              </Field>

              {/* result preview */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Resulting holding
                </p>
                <dl className="grid grid-cols-2 gap-y-2.5 text-sm">
                  <Row label="Cost basis" value={formatUSD(costBasis, { cents: true })} />
                  <Row label="Current value" value={formatUSD(marketValue, { cents: true })} />
                  <Row
                    label="Unrealized"
                    value={`${formatSignedUSD(gain)} (${formatPct(returnPct)})`}
                    valueClass={trendClass(gain)}
                  />
                  <Row label="Portfolio allocation" value={`${allocation.toFixed(1)}%`} />
                </dl>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={closeAdd} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit} className="flex-1 gap-1.5 rounded-xl font-semibold">
            <Check className="size-4" strokeWidth={2.5} />
            Add to collection
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('tabular text-right font-semibold text-foreground', valueClass)}>{value}</dd>
    </>
  )
}
