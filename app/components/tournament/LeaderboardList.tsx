import Link from 'next/link';
import { formatCurrency, formatReturn, cn, initialsFromName } from '@/lib/utils';
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
    <ol className="stack">
      {standings.map((row) => {
        const mine = userId && row.user_id === userId;
        return (
          <li
            key={row.user_id}
            className={cn(
              'panel panel-row',
              mine ? 'border-accent/50 bg-accent-dim' : ''
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="num w-8 shrink-0 text-sm font-semibold text-muted">#{row.rank}</span>
                <span className="avatar h-8 w-8 text-[11px]">{initialsFromName(row.display_name)}</span>
                <Link
                  href={`/players/${row.user_id}`}
                  className="truncate text-sm font-semibold text-foreground hover:text-accent-light"
                >
                  {row.display_name}
                </Link>
              </div>
              <span className="num shrink-0 text-sm font-medium text-foreground">
                {formatCurrency(row.portfolio_value)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-11 text-[11px] text-muted md:pl-[4.75rem]">
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
