import Link from 'next/link';
import { formatCurrency, formatReturn, cn } from '@/lib/utils';
import type { TournamentStanding } from '@/types';

export default function LeaderboardList({
  standings,
  userId,
}: {
  standings: TournamentStanding[];
  userId?: string | null;
}) {
  if (standings.length === 0) {
    return <p className="text-sm text-muted">No players yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {standings.map((row) => {
        const mine = userId && row.user_id === userId;
        return (
          <li
            key={row.user_id}
            className={cn(
              'panel px-4 py-3.5 md:px-5',
              mine ? 'border-accent/50 bg-accent-dim' : ''
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex items-baseline gap-3">
                <span className="num text-sm text-gold font-medium w-8 shrink-0">#{row.rank}</span>
                <Link href={`/players/${row.user_id}`} className="text-sm text-foreground font-medium truncate hover:text-accent-light">
                  {row.display_name}
                </Link>
              </div>
              <span className="num text-sm text-foreground shrink-0">{formatCurrency(row.portfolio_value)}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              <span className={row.return_pct >= 0 ? 'text-green' : 'text-red'}>
                {formatReturn(row.return_pct)}
              </span>
              <span>Cash {formatCurrency(row.cash)}</span>
              <span>Held {formatCurrency(row.holdings_value)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
