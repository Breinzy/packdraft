import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { getCareerStandings } from '@/lib/career/queries';
import { formatCurrency, formatReturn, cn } from '@/lib/utils';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';

export const dynamic = 'force-dynamic';

export default async function SandboxLeaderboardPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="sandbox">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Sandbox ranks</h1>
          <NeedsDatabase feature="Sandbox ranks" />
        </main>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/sandbox/leaderboard');

  let standings;
  try {
    standings = await getCareerStandings(supabase);
  } catch {
    return (
      <AppShell nav="sandbox">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Sandbox ranks</h1>
          <QueryFailed feature="Sandbox ranks" />
          <p className="text-sm text-muted">
            Apply <code className="text-foreground">20260902140000_phase13_career_progression.sql</code>.
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell nav="sandbox">
      <main className="page py-6 md:py-8 space-y-6">
        <Link href="/sandbox" className="text-sm text-muted min-h-11 inline-flex items-center">
          ← Sandbox
        </Link>
        <p className="text-sm text-muted">
          Live marked value of each Sandbox book. Tournament results stay on player history.
        </p>
        {standings.length === 0 ? (
          <p className="text-sm text-muted">No Sandbox books yet.</p>
        ) : (
          <ol className="space-y-2">
            {standings.map((row) => {
              const mine = row.user_id === user.id;
              return (
                <li
                  key={row.user_id}
                  className={cn('panel px-4 py-3.5', mine ? 'border-accent/50 bg-accent-dim' : '')}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex items-baseline gap-3">
                      <span className="num text-sm font-semibold text-muted w-8 shrink-0">#{row.rank}</span>
                      <Link href={`/players/${row.user_id}`} className="text-sm font-medium truncate">
                        {row.display_name}
                      </Link>
                    </div>
                    <span className="num text-sm shrink-0">{formatCurrency(row.portfolio_value)}</span>
                  </div>
                  <div className={`mt-1 text-[11px] ${row.return_pct >= 0 ? 'text-green' : 'text-red'}`}>
                    {formatReturn(row.return_pct)}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </AppShell>
  );
}
