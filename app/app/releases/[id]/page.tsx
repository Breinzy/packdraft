import { notFound } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { getReleaseCampaign } from '@/lib/releases/queries';

export const dynamic = 'force-dynamic';

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Release</h1>
          <NeedsDatabase feature="This release" />
        </main>
      </AppShell>
    );
  }

  let campaign;
  try {
    campaign = await getReleaseCampaign(supabase, id);
  } catch {
    return (
      <AppShell nav="play">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Release</h1>
          <QueryFailed feature="this release" />
        </main>
      </AppShell>
    );
  }
  if (!campaign) notFound();

  return (
    <AppShell nav="play">
      <main className="page py-6 md:py-8 space-y-6">
        <Link href="/releases" className="text-sm text-accent-light min-h-11 inline-flex items-center">
          ← Releases
        </Link>
        <div>
          <h1 className="page-title text-2xl">{campaign.name}</h1>
          <p className="text-sm text-muted mt-1.5">{campaign.description}</p>
        </div>
        <ul className="space-y-2">
          {campaign.items.map((item) => (
            <li key={`${item.kind}-${item.target_id}`}>
              <Link
                href={item.kind === 'tournament' ? `/tournaments/${item.target_id}` : `/events/${item.target_id}`}
                className="block panel px-4 py-3 panel-hover text-sm"
              >
                {item.kind === 'tournament' ? 'Portfolio tournament' : 'Prediction event'}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}
