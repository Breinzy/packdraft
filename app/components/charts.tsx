'use client'

import { useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { formatUSD } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ------------------------------ Sparkline ------------------------------ */

export function Sparkline({
  data,
  positive,
  className,
  strokeWidth = 1.5,
}: {
  data: number[]
  positive?: boolean
  className?: string
  strokeWidth?: number
}) {
  const id = useId().replace(/:/g, '')
  const up = positive ?? data[data.length - 1] >= data[0]
  const color = up ? 'var(--color-positive)' : 'var(--color-negative)'
  const points = useMemo(() => data.map((v, i) => ({ i, v })), [data])
  return (
    <div className={cn('h-10 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={strokeWidth}
            fill={`url(#spark-${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* --------------------------- Price Area Chart --------------------------- */

const RANGES = [
  { key: '1W', points: 7 },
  { key: '1M', points: 30 },
  { key: '3M', points: 90 },
  { key: '6M', points: 180 },
  { key: 'ALL', points: 180 },
] as const

type RangeKey = (typeof RANGES)[number]['key']

function PriceTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const value = payload[0].value as number
  return (
    <div className="rounded-lg border border-border-strong bg-popover px-3 py-2 shadow-xl">
      <div className="tabular text-sm font-semibold text-popover-foreground">
        {formatUSD(value, { cents: true })}
      </div>
    </div>
  )
}

export function PriceChart({
  history,
  className,
  defaultRange = '3M',
  height = 260,
}: {
  history: number[]
  className?: string
  defaultRange?: RangeKey
  height?: number
}) {
  const id = useId().replace(/:/g, '')
  const [range, setRange] = useState<RangeKey>(defaultRange)
  const sliced = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!
    const arr = history.slice(-r.points)
    return arr.map((v, i) => ({ i, v }))
  }, [history, range])

  const up = sliced.length > 1 && sliced[sliced.length - 1].v >= sliced[0].v
  const color = up ? 'var(--color-positive)' : 'var(--color-negative)'
  const min = Math.min(...sliced.map((d) => d.v))
  const max = Math.max(...sliced.map((d) => d.v))
  const pad = (max - min) * 0.15 || max * 0.05

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-end">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                'min-w-11 rounded-md px-2.5 py-1.5 text-xs font-semibold tabular transition-colors',
                range === r.key
                  ? 'bg-card-elevated text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced} margin={{ top: 6, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              fill={`url(#area-${id})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
            />
            <Tooltip
              content={<PriceTooltip />}
              cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            {/* invisible y domain control */}
            <Area dataKey={() => min - pad} stroke="transparent" fill="transparent" isAnimationActive={false} />
            <Area dataKey={() => max + pad} stroke="transparent" fill="transparent" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ---------------------------- Allocation Donut ---------------------------- */

export function AllocationDonut({
  data,
  className,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[]
  className?: string
  size?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={size * 0.32}
            outerRadius={size * 0.48}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Assets</span>
        <span className="tabular text-lg font-semibold text-foreground">{total > 0 ? data.length : 0}</span>
      </div>
    </div>
  )
}
