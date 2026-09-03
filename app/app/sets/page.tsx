import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { listSets } from '@/lib/market/catalog';
import { tryCreateServerClient } from '@/lib/supabase/server';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { SETS_PATH } from '@/lib/product/paths';

export const dynamic = 'force-dynamic';

function formatRelease(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    date
  );
}

export default async function SetsPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell>
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Sets</h1>
          <NeedsDatabase feature="Pokémon sets" />
        </main>
      </AppShell>
    );
  }

  let sets;
  try {
    sets = await listSets(supabase);
  } catch {
    return (
      <AppShell>
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Sets</h1>
          <QueryFailed feature="Pokémon sets" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="page py-6 md:py-8 space-y-6">
        <p className="text-sm text-muted">
          Pokémon expansions in the Packdraft catalog. Prices on each product still come from stored
          snapshots — nothing here is a set index invented for the UI.
        </p>

        {sets.length === 0 ? (
          <div className="panel p-6 text-sm text-muted">No sets imported yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sets.map((set) => (
              <Link
                key={set.id}
                href={`${SETS_PATH}/${set.id}`}
                className="panel panel-hover flex flex-col p-4 md:p-5"
              >
                <h2 className="text-base font-semibold tracking-tight text-foreground">{set.name}</h2>
                <p className="mt-1 text-xs text-muted">
                  {[formatRelease(set.release_date), set.asset_count ? `${set.asset_count} products` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Pokémon set'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
