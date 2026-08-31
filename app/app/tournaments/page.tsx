import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/tournament/StatusBadge';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { tryCreateServiceClient } from '@/lib/supabase/service';
import { listTournaments, tickTournaments } from '@/lib/tournament/queries';
import { formatCountdown, formatCurrency } from '@/lib/utils';
import { TOURNAMENT_STATUS_HELP } from '@/lib/tournament/lifecycle';
import NeedsDatabase from '@/components/ui/NeedsDatabase';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="px-4 md:px-8 py-6 md:py-10 max-w-4xl mx-auto space-y-6">
          <h1 className="text-xl md:text-3xl font-bold tracking-widest text-white">PLAY</h1>
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
        <main className="px-4 md:px-8 py-6 md:py-10 max-w-4xl mx-auto space-y-6">
          <h1 className="text-xl md:text-3xl font-bold tracking-widest text-white">PLAY</h1>
          <NeedsDatabase feature="Tournaments" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell nav="play">
      <main className="px-4 md:px-8 py-6 md:py-10 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-widest text-white">PLAY</h1>
          <p className="text-sm text-slate-500 mt-1 tracking-wider">
            Isolated tournaments. Virtual cash. Real Pokémon market prices.
          </p>
        </div>

        {tournaments.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-sm text-slate-500 tracking-wider">
            No tournaments yet. An admin can create one from the admin panel after Supabase is connected.
          </div>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="block bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">{t.name}</h2>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{TOURNAMENT_STATUS_HELP[t.status]}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 tracking-wider">
                    <span>BUDGET {formatCurrency(t.starting_budget)}</span>
                    {t.status === 'upcoming' ? <span>STARTS {formatCountdown(t.starts_at)}</span> : null}
                    {t.status === 'active' ? <span>CLOSES {formatCountdown(t.trading_closes_at)}</span> : null}
                    {t.status === 'completed' ? <span>SETTLED</span> : null}
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
