import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import PlayerStatGrid, { TradeHighlights } from '@/components/player/PlayerStatGrid';
import ResultHistory from '@/components/player/ResultHistory';
import AchievementList from '@/components/player/AchievementList';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { loadPlayerProfile } from '@/lib/player/queries';

export const dynamic = 'force-dynamic';

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="dashboard">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Player</h1>
          <NeedsDatabase feature="player history" />
        </main>
      </AppShell>
    );
  }

  let viewerId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    viewerId = null;
  }

  const isOwn = viewerId === id;
  let loaded;
  try {
    loaded = await loadPlayerProfile(supabase, id, { includeTrades: isOwn });
  } catch {
    return (
      <AppShell nav="dashboard">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Player</h1>
          <QueryFailed feature="player history" />
        </main>
      </AppShell>
    );
  }
  if (!loaded) notFound();

  const { displayName, history } = loaded;

  return (
    <AppShell nav="dashboard">
      <main className="page py-6 md:py-8 space-y-6">
        <Link href="/dashboard" className="text-sm text-muted min-h-11 inline-flex items-center">
          ← Home
        </Link>
        <div>
          <h1 className="page-title text-2xl">{displayName}</h1>
          <p className="text-sm text-muted mt-1.5">
            Tournament record. Books reset each event; this history stays.
          </p>
        </div>

        <PlayerStatGrid history={history} />
        <TradeHighlights history={history} />

        <section className="space-y-3">
          <h2 className="section-title">Achievements</h2>
          <AchievementList achievements={history.achievements} />
        </section>

        <section className="space-y-3">
          <h2 className="section-title">Tournament history</h2>
          <ResultHistory results={history.results} />
        </section>
      </main>
    </AppShell>
  );
}
