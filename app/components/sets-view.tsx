'use client'

import Link from 'next/link'
import { sets } from '@/lib/data'
import { Sparkline } from '@/components/charts'
import { ChangeBadge } from '@/components/primitives'
import { formatUSD, formatDate } from '@/lib/format'

export function SetsView() {
  if (sets.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No Pokémon sets are in the Packdraft catalog yet.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sets.map((s) => {
        return (
          <Link
            key={s.id}
            href={`/sets/${s.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-border-strong hover:bg-card-elevated"
          >
            <div
              className="relative flex h-28 items-center justify-center overflow-hidden"
              style={{
                background: `radial-gradient(120% 130% at 50% 0%, ${s.logoColor.replace(')', ' / 0.35)')}, var(--card) 70%)`,
              }}
            >
              <span
                className="flex size-14 items-center justify-center rounded-2xl text-lg font-black text-background shadow-lg"
                style={{ background: s.logoColor }}
              >
                {s.code}
              </span>
              <span className="absolute right-3 top-3">
                <ChangeBadge value={s.change30d} />
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h3 className="text-base font-bold tracking-tight text-foreground">{s.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(s.releasedAt)} · {s.cardCount} cards
              </p>

              <div className="my-3 -mx-1">
                <Sparkline data={s.history.slice(-60)} className="h-10" />
              </div>

              <div className="mt-auto flex items-end justify-between border-t border-border pt-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Set index</p>
                  <p className="tabular text-lg font-bold text-foreground">{formatUSD(s.price)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular">{s.trackedCount} tracked</p>
                  <p className="tabular">{s.sealedCount} sealed</p>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
