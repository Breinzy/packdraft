'use client';

import { useId, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export type ChartPoint = { at: string; value: number };
type RangeKey = '1D' | '1W' | '1M' | '3M' | 'ALL';

const RANGES: { key: RangeKey; ms: number | null }[] = [
  { key: '1D', ms: 24 * 60 * 60 * 1000 },
  { key: '1W', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: '3M', ms: 90 * 24 * 60 * 60 * 1000 },
  { key: 'ALL', ms: null },
];

export default function PortfolioChart({
  series,
  currentValue,
}: {
  series: ChartPoint[];
  currentValue: number;
}) {
  const [range, setRange] = useState<RangeKey>('ALL');

  const points = useMemo(() => {
    const latest = series.length ? new Date(series[series.length - 1]!.at).getTime() : 0;
    const spec = RANGES.find((r) => r.key === range);
    const cutoff = spec?.ms == null || !latest ? 0 : latest - spec.ms;
    const filtered = series.filter((p) => new Date(p.at).getTime() >= cutoff);
    const values = (filtered.length >= 2 ? filtered : series).map((p) => p.value);
    if (values.length === 0 || values[values.length - 1] !== currentValue) {
      values.push(currentValue);
    }
    return values;
  }, [series, range, currentValue]);

  return (
    <div>
      <div className="flex justify-end">
        <div className="seg" role="tablist" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              data-active={range === r.key}
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <AreaChart points={points} />
      </div>
    </div>
  );
}

export function AreaChart({ points }: { points: number[] }) {
  const gid = useId().replace(/:/g, '');
  if (points.length < 2) {
    return (
      <div className="flex h-44 items-center text-sm text-faint">Not enough history yet</div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 640;
  const h = 220;
  const padL = 64;
  const padR = 24;
  const padT = 20;
  const padB = 36;
  const coords = points.map((p, i) => {
    const x = padL + (i / (points.length - 1)) * (w - padL - padR);
    const y = padT + (1 - (p - min) / span) * (h - padT - padB);
    return { x, y };
  });
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${padL},${h - padB} ${line} ${coords[coords.length - 1]!.x.toFixed(1)},${h - padB}`;
  const ticks = [min, min + span / 2, max];
  const xLabels = ['Start', '', '', '', 'Now'];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full md:h-56" role="img" aria-label="Portfolio value">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tick) => {
        const y = padT + (1 - (tick - min) / span) * (h - padT - padB);
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="#2a3340"
              strokeDasharray="3 6"
              strokeWidth="1"
            />
            <text x={10} y={y + 4} fill="#6e7681" fontSize="11">
              {compactUsd(tick)}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={line}
      />
      {xLabels.map((label, i) =>
        label ? (
          <text
            key={label}
            x={padL + (i / (xLabels.length - 1)) * (w - padL - padR)}
            y={h - 8}
            fill="#6e7681"
            fontSize="11"
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
          >
            {label}
          </text>
        ) : null
      )}
    </svg>
  );
}

function compactUsd(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
}
