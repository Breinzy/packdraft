import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/tournament/StatusBadge';
import type { Profile } from '@/types';
import { getUserActiveBooks } from '@/lib/tournament/queries';
import { formatCurrency } from '@/lib/utils';
import { canTradeStatus } from '@/lib/tournament/lifecycle';

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

  return (
    <AppShell nav="dashboard">
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
            <h1 className="text-lg md:text-2xl font-bold tracking-widest text-white mb-1 md:mb-2">
              WELCOME BACK, {name.toUpperCase()}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 tracking-wider">{typed.email}</p>
            <Link
              href={`/players/${user.id}`}
              className="inline-flex min-h-11 items-center mt-3 text-xs tracking-widest text-accent-light"
            >
              VIEW RECORD
            </Link>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs tracking-widest text-slate-600">YOUR TOURNAMENTS</h2>
              <Link href="/tournaments" className="text-xs tracking-widest text-accent-light min-h-11 inline-flex items-center">
                ALL
              </Link>
            </div>
            {books.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6">
                <p className="text-sm text-slate-400 tracking-wider mb-3">No tournament book yet.</p>
                <Link
                  href="/tournaments"
                  className="inline-flex min-h-12 items-center px-5 rounded-xl text-sm font-bold tracking-widest text-white"
                  style={{ background: 'linear-gradient(135deg, #5b89bf, #4a78ae)' }}
                >
                  FIND A TOURNAMENT
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {[...live, ...past].map(({ tournament, portfolio }) => (
                  <li key={tournament.id}>
                    <Link
                      href={`/tournaments/${tournament.id}`}
                      className="block bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4 hover:border-white/20"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white font-bold truncate">{tournament.name}</span>
                        <StatusBadge status={tournament.status} />
                      </div>
                      <div className="mt-2 text-xs text-slate-500 tracking-wider">
                        CASH {formatCurrency(portfolio.cash)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/assets"
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 hover:border-white/20"
            >
              <div className="text-[10px] text-slate-600 tracking-widest mb-3">MARKET</div>
              <div className="text-sm text-white tracking-wider">Browse Pokémon assets</div>
            </Link>
            <Link
              href="/tournaments"
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 hover:border-white/20"
            >
              <div className="text-[10px] text-slate-600 tracking-widest mb-3">PLAY</div>
              <div className="text-sm text-white tracking-wider">Join a tournament</div>
            </Link>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
