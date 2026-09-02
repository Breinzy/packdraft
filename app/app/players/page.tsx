import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { getPlayerRankings } from '@/lib/social/queries';
import { formatReturn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="dashboard">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Players</h1>
          <NeedsDatabase feature="Player rankings" />
        </main>
      </AppShell>
    );
  }

  let rankings;
  try {
    rankings = await getPlayerRankings(supabase);
  } catch {
    return (
      <AppShell nav="dashboard">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Players</h1>
          <QueryFailed feature="Player rankings" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell nav="dashboard">
      <main className="page py-6 md:py-8 space-y-6">
        <div>
          <h1 className="page-title text-2xl">Players</h1>
          <p className="text-sm text-muted mt-1.5">
            Tournament record only. Career value is a separate book.
          </p>
        </div>
        {rankings.length === 0 ? (
          <p className="text-sm text-muted">No settled tournament results yet.</p>
        ) : (
          <ol className="space-y-2">
            {rankings.map((row) => (
              <li key={row.user_id} className="panel px-4 py-3.5 flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex items-baseline gap-3">
                  <span className="num text-sm text-gold font-medium w-8 shrink-0">#{row.rank}</span>
                  <Link href={`/players/${row.user_id}`} className="text-sm font-medium truncate">
                    {row.display_name}
                  </Link>
                </div>
                <span className="text-xs text-muted shrink-0">
                  {row.wins}W / {row.played} · {formatReturn(row.average_return)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </main>
    </AppShell>
  );
}
