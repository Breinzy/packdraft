import Link from 'next/link';
import { Icon } from '@/components/icons';
import { formatCurrency, formatRelativeTime, initialsFromName, formatReturn, cn } from '@/lib/utils';

export type LeaderRow = {
  user_id: string;
  display_name: string;
  rank: number;
  portfolio_value: number;
  return_pct: number;
};

export function LeaderboardPreview({
  rows,
  userId,
  hrefAll,
}: {
  rows: LeaderRow[];
  userId?: string | null;
  hrefAll?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No players yet.</p>;
  }

  const mine = userId ? rows.find((r) => r.user_id === userId) : undefined;
  const total = rows.length;
  const percentile =
    mine && total > 0 ? Math.max(1, Math.ceil((mine.rank / total) * 100)) : null;

  const visible = pickAroundUser(rows, userId);

  return (
    <div>
      {mine ? (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-border bg-surface-3 p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Your rank #{mine.rank}</p>
            <span className={`num text-sm ${mine.return_pct >= 0 ? 'text-green' : 'text-red'}`}>
              {formatReturn(mine.return_pct)}
            </span>
          </div>
          {percentile != null && percentile <= 50 ? (
            <p className="mt-1 text-xs text-muted">Top {percentile}%</p>
          ) : null}
        </div>
      ) : null}
      <ol className="space-y-1">
        {visible.map((row) => {
          const isMine = userId === row.user_id;
          return (
            <li key={row.user_id}>
              <Link
                href={`/players/${row.user_id}`}
                className={cn(
                  'flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 transition-colors',
                  isMine ? 'bg-accent-dim' : 'hover:bg-surface-3'
                )}
              >
                <span className="num w-6 shrink-0 text-xs text-muted">#{row.rank}</span>
                <span className="avatar h-8 w-8 text-[11px]">{initialsFromName(row.display_name)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {row.display_name}
                </span>
                <span className={`num shrink-0 text-sm ${row.return_pct >= 0 ? 'text-green' : 'text-red'}`}>
                  {formatReturn(row.return_pct)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {hrefAll ? (
        <Link href={hrefAll} className="link-quiet mt-3 inline-flex min-h-11 items-center">
          View all
        </Link>
      ) : null}
    </div>
  );
}

function pickAroundUser(rows: LeaderRow[], userId?: string | null): LeaderRow[] {
  if (rows.length <= 6) return rows;
  const idx = userId ? rows.findIndex((r) => r.user_id === userId) : -1;
  if (idx < 0) return [...rows.slice(0, 3), ...rows.slice(-2)];
  if (idx <= 2) return rows.slice(0, 6);
  return [...rows.slice(0, 3), ...rows.slice(Math.max(3, idx - 1), idx + 2)];
}

export function ActivityList({
  items,
  hrefAll,
}: {
  items: { id: string; title: string; detail: string; at: string; side?: 'buy' | 'sell' }[];
  hrefAll?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 rounded-[var(--radius-md)] px-1 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-3 text-muted">
            <Icon name={item.side === 'sell' ? 'tag' : 'cart'} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
            <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
          </span>
          <span className="shrink-0 text-[11px] text-faint">{formatRelativeTime(item.at)}</span>
        </li>
      ))}
      {hrefAll ? (
        <li>
          <Link href={hrefAll} className="link-quiet inline-flex min-h-11 items-center">
            View all
          </Link>
        </li>
      ) : null}
    </ul>
  );
}

export function formatActivityDetail(side: 'buy' | 'sell', quantity: number, total: number): string {
  return `${side === 'buy' ? 'Bought' : 'Sold'} ${quantity} · ${formatCurrency(total)}`;
}
