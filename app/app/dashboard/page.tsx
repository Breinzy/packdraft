import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/tournament/StatusBadge';
import type { Profile } from '@/types';
import { getUserActiveBooks } from '@/lib/tournament/queries';
import { formatCurrency } from '@/lib/utils';
import { canTradeStatus } from '@/lib/tournament/lifecycle';
import AdSlot from '@/components/ads/AdSlot';
import { isPro } from '@/lib/auth/pro';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Player';

    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        display_name: displayName,
        display_name_set: false,
      })
      .select()
      .single();

    profile = created;
  }

  if (profile && !profile.display_name_set) {
    redirect('/auth/onboarding');
  }

  const typed = profile as Profile;
  const name = typed.display_name || typed.email.split('@')[0];
  const books = await getUserActiveBooks(supabase, user.id);
  const live = books.filter((b) => canTradeStatus(b.tournament.status) || b.tournament.status === 'upcoming');
  const past = books.filter((b) => !live.includes(b));
  const pro = isPro(typed.pro_until);

  return (
    <AppShell nav="dashboard">
      <main className="page py-6 md:py-8 space-y-8">
        <div>
          <h1 className="page-title text-2xl">Hey, {name}</h1>
          <p className="text-sm text-muted mt-1.5">{typed.email}</p>
          <div className="flex flex-wrap gap-x-4">
            <Link href={`/players/${user.id}`} className="inline-flex min-h-11 items-center text-sm text-accent-light">
              View record
            </Link>
            <Link href="/social" className="inline-flex min-h-11 items-center text-sm text-accent-light">
              Social
            </Link>
          </div>
        </div>

        <AdSlot hidden={pro} />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Your tournaments</h2>
            <Link href="/tournaments" className="text-sm text-accent-light min-h-11 inline-flex items-center">
              All
            </Link>
          </div>
          {books.length === 0 ? (
            <div className="panel p-5">
              <p className="text-sm text-muted mb-4">No tournament book yet.</p>
              <Link href="/tournaments" className="btn btn-primary">
                Find a tournament
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {[...live, ...past].map(({ tournament, portfolio }) => (
                <li key={tournament.id}>
                  <Link href={`/tournaments/${tournament.id}`} className="block panel panel-hover px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-foreground font-medium truncate">{tournament.name}</span>
                      <StatusBadge status={tournament.status} />
                    </div>
                    <div className="mt-1.5 text-xs text-muted">Cash {formatCurrency(portfolio.cash)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/assets" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Market</div>
            <div className="text-sm text-muted">Browse Pokémon assets</div>
          </Link>
          <Link href="/tournaments" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Play</div>
            <div className="text-sm text-muted">Join a tournament</div>
          </Link>
          <Link href="/events" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Events</div>
            <div className="text-sm text-muted">Predict a market move</div>
          </Link>
          <Link href="/career" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Career</div>
            <div className="text-sm text-muted">Grow a $1,000 book</div>
          </Link>
          <Link href="/social" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Social</div>
            <div className="text-sm text-muted">Friends, follows, feed</div>
          </Link>
          <Link href="/create" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Host</div>
            <div className="text-sm text-muted">Creator tournament</div>
          </Link>
          <Link href="/releases" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Releases</div>
            <div className="text-sm text-muted">Set-drop weekends</div>
          </Link>
          <Link href="/players" className="panel panel-hover px-4 py-4">
            <div className="section-title mb-1">Rankings</div>
            <div className="text-sm text-muted">Tournament records</div>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
