import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { listReleaseCampaigns } from '@/lib/releases/queries';
import { formatCountdown } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReleasesPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="page page-main stack">
          <h1 className="page-title text-2xl">Releases</h1>
          <NeedsDatabase feature="Release events" />
        </main>
      </AppShell>
    );
  }

  let campaigns;
  try {
    campaigns = await listReleaseCampaigns(supabase);
  } catch {
    return (
      <AppShell nav="play">
        <main className="page page-main stack">
          <h1 className="page-title text-2xl">Releases</h1>
          <QueryFailed feature="Release events" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell nav="play">
      <main className="page page-main stack">
        <div>
          <p className="text-sm text-muted">
            A tournament plus predictions around a set drop. Still virtual. Still free.
          </p>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted">No release weekends yet. An admin can create one.</p>
        ) : (
          <ul className="stack">
            {campaigns.map((row) => (
              <li key={row.id}>
                <Link href={`/releases/${row.id}`} className="block panel panel-hover">
                  <div className="font-medium text-foreground">{row.name}</div>
                  <div className="mt-2 text-xs text-muted">Ends {formatCountdown(row.ends_at)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
