import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { listFeed, listPendingFriendRequests } from '@/lib/social/queries';
import { formatTimestamp } from '@/lib/utils';
import SocialActions from '@/components/social/SocialActions';

export const dynamic = 'force-dynamic';

export default async function SocialPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="dashboard">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Social</h1>
          <NeedsDatabase feature="Social" />
        </main>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/social');

  let feed;
  let requests;
  try {
    [feed, requests] = await Promise.all([
      listFeed(supabase),
      listPendingFriendRequests(supabase, user.id),
    ]);
  } catch {
    return (
      <AppShell nav="dashboard">
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Social</h1>
          <QueryFailed feature="Social" />
          <p className="text-sm text-muted">
            Apply <code className="text-foreground">20260902160000_phase16_social.sql</code>.
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell nav="dashboard">
      <main className="page py-6 md:py-8 space-y-6">
        <div>
          <p className="text-sm text-muted mt-0">
            Friends, follows, and a feed. Tournament books stay isolated.
          </p>
        </div>
        <Link href="/players" className="text-sm text-accent-light min-h-11 inline-flex items-center">
          Player rankings
        </Link>

        {requests.length > 0 ? (
          <section className="space-y-2">
            <h2 className="section-title">Friend requests</h2>
            {requests.map((row) => (
              <div key={row.id} className="panel px-4 py-3 space-y-2">
                <Link href={`/players/${row.requester_id}`} className="text-sm font-medium">
                  {row.requester_name}
                </Link>
                <SocialActions
                  userId={row.requester_id}
                  following={false}
                  friends={false}
                  outgoing={false}
                  incomingId={row.id}
                />
              </div>
            ))}
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="section-title">Feed</h2>
          {feed.length === 0 ? (
            <p className="text-sm text-muted">Follow players or add friends to fill this.</p>
          ) : (
            <ul className="space-y-2">
              {feed.map((row) => (
                <li key={row.id} className="panel px-4 py-3">
                  <Link href={`/players/${row.actor_id}`} className="text-sm font-medium">
                    {row.actor_name}
                  </Link>
                  <p className="text-sm text-muted mt-1">{row.summary}</p>
                  <p className="text-[11px] text-faint mt-1">{formatTimestamp(row.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
