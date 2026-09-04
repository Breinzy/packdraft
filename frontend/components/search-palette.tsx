'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, Flame, CornerDownLeft } from 'lucide-react'
import { useUI } from '@/lib/ui'
import { search, POPULAR_SEARCHES, type SearchResult } from '@/lib/search'
import { AssetToken, TypePill, ChangeBadge } from '@/components/primitives'
import { formatUSD, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const RECENT_KEY = 'packdraft.recent'

export function SearchPalette() {
  const { searchOpen, closeSearch } = useUI()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => search(query), [query])

  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setActive(0)
      try {
        setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'))
      } catch {}
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [searchOpen])

  useEffect(() => setActive(0), [query])

  function go(r: SearchResult) {
    const label = r.kind === 'set' ? r.set.name : r.asset.name
    const next = [label, ...recent.filter((x) => x !== label)].slice(0, 6)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {}
    closeSearch()
    router.push(r.kind === 'set' ? `/sets/${r.set.id}` : `/asset/${r.asset.id}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active])
    }
  }

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]">
      <button
        type="button"
        aria-label="Close search"
        onClick={closeSearch}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border-strong bg-popover shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search Pokemon cards, sealed products, sets..."
            className="h-14 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={closeSearch}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {query && results.length === 0 && (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No results for &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a Pokemon name, set, or product type.</p>
            </div>
          )}

          {!query && (
            <div className="space-y-4 p-1.5">
              {recent.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="size-3" /> Recent
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((r) => (
                      <button
                        key={r}
                        onClick={() => setQuery(r)}
                        className="rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Flame className="size-3" /> Popular
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCHES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {results.map((r, i) => {
            const key = r.kind === 'set' ? r.set.id : r.asset.id
            return (
              <button
                key={key}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                  active === i ? 'bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                {r.kind === 'set' ? (
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-black text-background"
                    style={{ background: r.set.logoColor }}
                  >
                    {r.set.code}
                  </span>
                ) : (
                  <AssetToken asset={r.asset} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {r.kind === 'set' ? r.set.name : r.asset.name}
                    </span>
                    <TypePill type={r.kind} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.kind === 'set'
                      ? `Expansion · ${r.set.cardCount} cards · ${formatDate(r.set.releasedAt)}`
                      : `${r.asset.subtitle} · ${r.asset.setName}`}
                  </p>
                </div>
                <div className="hidden shrink-0 flex-col items-end sm:flex">
                  <span className="tabular text-sm font-semibold text-foreground">
                    {formatUSD(r.kind === 'set' ? r.set.price : r.asset.price)}
                  </span>
                  <ChangeBadge value={r.kind === 'set' ? r.set.change30d : r.asset.change24h} showIcon={false} />
                </div>
                {active === i && <CornerDownLeft className="hidden size-4 shrink-0 text-muted-foreground sm:block" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
