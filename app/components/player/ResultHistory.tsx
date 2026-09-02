import Link from 'next/link';
import { formatCurrency, formatReturn } from '@/lib/utils';
import type { HistoryResult } from '@/lib/player/history';

export default function ResultHistory({ results }: { results: HistoryResult[] }) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-muted">
        No settled tournaments yet. Active books do not count until the event completes.
      </p>
    );
  }

  return (
    <ul className="stack">
      {results.map((row) => (
        <li key={row.tournamentId}>
          <Link
            href={`/tournaments/${row.tournamentId}`}
            className="block panel panel-hover"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-foreground font-bold truncate">{row.tournamentName}</span>
              <span className="text-gold text-sm font-bold shrink-0">#{row.rank}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              <span className={row.returnPct >= 0 ? 'text-green' : 'text-red'}>
                {formatReturn(row.returnPct)}
              </span>
              <span>{formatCurrency(row.finalValue)}</span>
              <span>{new Date(row.lockedAt).toLocaleDateString()}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
