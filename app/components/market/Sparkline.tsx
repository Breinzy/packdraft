'use client';

import { useId } from 'react';

interface SparklineProps {
  points: number[];
  className?: string;
  variant?: 'signed' | 'brand';
}

export default function Sparkline({ points, className, variant = 'signed' }: SparklineProps) {
  const gid = useId().replace(/:/g, '');
  if (points.length < 2) {
    return (
      <div className={`flex items-center text-xs text-faint ${className ?? ''}`}>
        Not enough history yet
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 320;
  const h = 72;
  const pad = 4;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p - min) / span) * (h - pad * 2);
    return { x, y, s: `${x.toFixed(1)},${y.toFixed(1)}` };
  });
  const up = points[points.length - 1]! >= points[0]!;
  const color = variant === 'brand' ? '#3b82f6' : up ? '#10b981' : '#f87171';
  const last = coords[coords.length - 1]!;
  const area = `${pad},${h - pad} ${coords.map((c) => c.s).join(' ')} ${last.x.toFixed(1)},${h - pad}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className ?? 'h-20 w-full'}
      role="img"
      aria-label="Price history"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={pad}
          x2={w - pad}
          y1={pad + t * (h - pad * 2)}
          y2={pad + t * (h - pad * 2)}
          stroke="#2a3340"
          strokeDasharray="2 5"
          strokeWidth="1"
        />
      ))}
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.map((c) => c.s).join(' ')}
      />
    </svg>
  );
}
