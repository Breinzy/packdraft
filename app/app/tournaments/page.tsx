import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/tournament/StatusBadge';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { listTournaments, tickTournaments } from '@/lib/tournament/queries';
import { formatCountdown, formatCurrency } from '@/lib/utils';
import { TOURNAMENT_STATUS_HELP } from '@/lib/tournament/lifecycle';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Play</h1>
          <NeedsDatabase feature="Tournaments" />
        </main>
      </AppShell>
    );
  }
  const service = tryCreateServiceClient();
  if (service) {
    try {
      await tickTournaments(service);
    } catch {
      // Display stored status if tick cannot run yet.
    }
  }

  let tournaments;
  try {
    tournaments = await listTournaments(supabase);
  } catch {
    return (
      <AppShell nav="play">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Play</h1>
          <QueryFailed feature="tournaments" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell nav="play">
      <main className="page py-6 md:py-8 space-y-6">
        <div>
          <h1 className="page-title text-2xl">Play</h1>
          <p className="text-sm text-muted mt-1.5">
            Isolated tournaments. Virtual cash. Real Pokémon market prices.
          </p>
        </div>

        {tournaments.length === 0 ? (
            <div className="panel p-5 text-sm text-muted">
              No tournaments yet. An admin can create one from /admin.
            </div>
        ) : (
          <ul className="space-y-2">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="block panel p-4 md:p-5 panel-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-medium text-foreground">{t.name}</h2>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm text-muted mt-2">{TOURNAMENT_STATUS_HELP[t.status]}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>Budget {formatCurrency(t.starting_budget)}</span>
                    {t.status === 'upcoming' ? <span>Starts {formatCountdown(t.starts_at)}</span> : null}
                    {t.status === 'active' ? <span>Closes {formatCountdown(t.trading_closes_at)}</span> : null}
                    {t.status === 'completed' ? <span>Settled</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
