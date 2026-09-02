import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import TournamentCard from '@/components/tournament/TournamentCard';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { listTournaments, tickTournaments } from '@/lib/tournament/queries';
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
        <div className="flex flex-wrap gap-x-4">
          <Link href="/events" className="inline-flex min-h-11 items-center text-sm text-accent-light">
            Predict a market event
          </Link>
          <Link href="/releases" className="inline-flex min-h-11 items-center text-sm text-accent-light">
            Release weekends
          </Link>
          <Link href="/create" className="inline-flex min-h-11 items-center text-sm text-accent-light">
            Host a tournament
          </Link>
        </div>

        {tournaments.length === 0 ? (
            <div className="panel p-5 text-sm text-muted">
              No tournaments yet. An admin can create one from /admin.
            </div>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <TournamentCard tournament={t} href={`/tournaments/${t.id}`} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
