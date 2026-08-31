import Link from 'next/link';
import { formatCurrency, formatReturn } from '@/lib/utils';
import type { HistoryResult } from '@/lib/player/history';

export default function ResultHistory({ results }: { results: HistoryResult[] }) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-slate-500 tracking-wider">
        No settled tournaments yet. Join a tournament to start a record.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {results.map((row) => (
        <li key={row.tournamentId}>
          <Link
            href={`/tournaments/${row.tournamentId}`}
            className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 hover:border-white/20"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-white font-bold truncate">{row.tournamentName}</span>
              <span className="text-gold text-sm font-bold shrink-0">#{row.rank}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 tracking-wider">
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
