'use client';

interface SparklineProps {
  points: number[];
  className?: string;
}

export default function Sparkline({ points, className }: SparklineProps) {
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
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = points[points.length - 1]! >= points[0]!;
  const color = up ? '#62b58a' : '#d96b5e';

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className ?? 'w-full h-20'}
      role="img"
      aria-label="Price history"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(' ')}
      />
    </svg>
  );
}
