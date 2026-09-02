import { notFound } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/tournament/StatusBadge';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { mapTournament } from '@/lib/tournament/queries';

export const dynamic = 'force-dynamic';

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Creator</h1>
          <NeedsDatabase feature="Creator page" />
        </main>
      </AppShell>
    );
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, creator_slug, creator_bio, is_creator')
    .eq('creator_slug', slug)
    .maybeSingle();
  if (error) {
    return (
      <AppShell nav="play">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Creator</h1>
          <QueryFailed feature="this creator" />
        </main>
      </AppShell>
    );
  }
  if (!profile || !profile.is_creator) notFound();

  const { data: rows } = await supabase
    .from('tournaments')
    .select('*')
    .eq('created_by', profile.id)
    .order('starts_at', { ascending: false });

  const tournaments = (rows ?? []).map((row) => mapTournament(row as Record<string, unknown>));

  return (
    <AppShell nav="play">
      <main className="page py-6 md:py-8 space-y-6">
        <div>
          <h1 className="page-title text-2xl">{profile.display_name || slug}</h1>
          <p className="text-sm text-muted mt-1.5">{profile.creator_bio || 'Creator tournaments.'}</p>
        </div>
        {tournaments.length === 0 ? (
          <p className="text-sm text-muted">No hosted tournaments yet.</p>
        ) : (
          <ul className="space-y-2">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link href={`/tournaments/${t.id}`} className="block panel p-4 panel-hover">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{t.name}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Free · Budget {formatCurrency(t.starting_budget)}
                    {t.sponsor_name ? ` · ${t.sponsor_name}` : ''}
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
