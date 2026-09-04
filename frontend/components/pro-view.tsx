'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Gauge,
  Activity,
  Crosshair,
  Compass,
  Check,
  ArrowRight,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssetToken } from '@/components/primitives'
import { cn } from '@/lib/utils'

/* ------------------------------ Mock viz bits ------------------------------ */

function ConcentrationViz() {
  const rows = [
    { label: 'Prismatic Evolutions', pct: 38 },
    { label: 'Surging Sparks', pct: 24 },
    { label: 'Sealed booster boxes', pct: 19 },
  ]
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="truncate text-muted-foreground">{r.label}</span>
            <span className="tabular font-semibold text-foreground">{r.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function VolumeViz() {
  const bars = [40, 52, 34, 60, 48, 72, 58, 84, 66, 92, 78, 100]
  return (
    <div className="space-y-2">
      <div className="flex h-16 items-end gap-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/70"
            style={{ height: `${h}%`, opacity: 0.35 + (i / bars.length) * 0.65 }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">30d sales volume</span>
        <span className="tabular font-semibold text-positive">+42%</span>
      </div>
    </div>
  )
}

function PositionViz() {
  const chips = ['3.1× PSA 10 premium', 'Thin liquidity', '+12% vs set avg']
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <AssetToken asset={{ name: 'Umbreon ex', energy: 'darkness', type: 'card' }} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Umbreon ex</p>
          <p className="tabular text-[11px] text-muted-foreground">161/131 · Prismatic Evolutions</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}

function OpportunityViz() {
  const rows = [
    { name: 'Espeon ex', energy: 'psychic' as const, reason: 'Completes your Eeveelution set' },
    { name: 'Destined Rivals BB', energy: 'fire' as const, reason: 'Matches your sealed strategy' },
  ]
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground">Picked for your collection</p>
      {rows.map((r) => (
        <div
          key={r.name}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-card-elevated/60 p-2"
        >
          <AssetToken asset={{ name: r.name, energy: r.energy, type: 'card' }} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{r.name}</p>
            <p className="truncate text-[10px] text-primary">{r.reason}</p>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
        </div>
      ))}
    </div>
  )
}

function AIResearchViz() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="space-y-2.5">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          How concentrated is my portfolio, and where&apos;s my biggest risk?
        </div>
        <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-2.5 text-sm leading-relaxed text-foreground">
          You&apos;re <span className="font-semibold text-primary">38% weighted</span> to Prismatic Evolutions.
          Your largest single-asset risk is{' '}
          <span className="font-semibold text-foreground">Umbreon ex</span> at{' '}
          <span className="tabular font-semibold">14%</span> of holdings, trading on thin liquidity.
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 rounded-xl border border-border bg-card-elevated px-3 py-2">
        <span className="flex-1 truncate text-sm text-muted-foreground">Ask about your portfolio…</span>
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Send className="size-3.5" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  )
}

/* ------------------------------ Feature card ------------------------------ */

function FeatureCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Gauge
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border-strong',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-muted text-primary">
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

/* --------------------------------- Page --------------------------------- */

const PLAN_INCLUDES = [
  'Portfolio, Market & Position Intelligence',
  'Opportunity discovery & smart alerts',
  'AI research on your live portfolio data',
  'Advanced charts, exports & unlimited watchlists',
]

export function ProView() {
  const [annual, setAnnual] = useState(true)
  const MONTHLY = 10
  const ANNUAL_TOTAL = 99
  const price = annual ? (ANNUAL_TOTAL / 12).toFixed(2) : MONTHLY.toFixed(0)

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative px-5 py-8 sm:px-8 sm:py-12">
          <span
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, var(--primary), transparent)' }}
            aria-hidden
          />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="size-3" strokeWidth={2.5} />
              Packdraft Pro
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
              Know more about your collection.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Pro turns Packdraft from a tracker into an intelligence platform — deeper insight into your
              exposure, the market, every position, and the opportunities worth researching next.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-11 gap-1.5 rounded-xl font-semibold">
                <Sparkles className="size-4" strokeWidth={2.5} />
                Upgrade to Pro
              </Button>
              <span className="text-sm text-muted-foreground">
                <span className="tabular font-semibold text-foreground">${MONTHLY}/mo</span> · $
                {ANNUAL_TOTAL}/yr · cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">What you unlock</h2>
          <span className="text-xs font-medium text-muted-foreground">5 intelligence layers</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-6">
          <FeatureCard
            icon={Gauge}
            title="Portfolio Intelligence"
            description="Understand your exposure, concentration, risk, and performance at a glance."
            className="lg:col-span-2"
          >
            <ConcentrationViz />
          </FeatureCard>

          <FeatureCard
            icon={Activity}
            title="Market Intelligence"
            description="See liquidity, sales activity, volume, and deeper market trends as they move."
            className="lg:col-span-2"
          >
            <VolumeViz />
          </FeatureCard>

          <FeatureCard
            icon={Crosshair}
            title="Position Intelligence"
            description="Understand each position in context — not just whether it's up or down."
            className="lg:col-span-2"
          >
            <PositionViz />
          </FeatureCard>

          <FeatureCard
            icon={Compass}
            title="Opportunity Intelligence"
            description="Surface assets and listings worth researching, tailored to your collection and the way you invest."
            className="lg:col-span-2"
          >
            <OpportunityViz />
          </FeatureCard>

          <FeatureCard
            icon={Sparkles}
            title="AI Research"
            description="Ask questions about your actual portfolio and live market data — in plain language."
            className="lg:col-span-4"
          >
            <AIResearchViz />
          </FeatureCard>
        </div>
      </section>

      {/* PRICING */}
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Upgrade to Packdraft Pro
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Everything in your collection, understood in depth. One subscription, all five intelligence layers.
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {PLAN_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-positive" strokeWidth={2.5} />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full shrink-0 rounded-2xl border border-border bg-card-elevated p-5 lg:w-80">
            <div className="mb-4 inline-flex items-center rounded-lg bg-secondary p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-colors',
                  !annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
                  annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Annual
                <span className="rounded bg-positive-muted px-1 py-0.5 text-[9px] font-bold uppercase text-positive">
                  -17%
                </span>
              </button>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="tabular text-4xl font-bold tracking-tight text-foreground">${price}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {annual ? `Billed annually at $${ANNUAL_TOTAL}` : 'Billed monthly'}
            </p>

            <Button size="lg" className="mt-5 h-11 w-full gap-1.5 rounded-xl font-semibold">
              <Sparkles className="size-4" strokeWidth={2.5} />
              Upgrade to Pro
            </Button>
            <Link
              href="/"
              className="mt-2 block text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Continue on Free
            </Link>

            <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-positive" strokeWidth={2} />
              14-day money-back guarantee
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
