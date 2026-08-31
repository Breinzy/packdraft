import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import type { Profile } from '@/types';

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

  return (
    <AppShell nav="dashboard">
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
            <h1 className="text-lg md:text-2xl font-bold tracking-widest text-white mb-1 md:mb-2">
              WELCOME BACK, {name.toUpperCase()}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 tracking-wider">{typed.email}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
              <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">
                TOURNAMENT
              </div>
              <div className="text-sm md:text-base text-slate-400 tracking-wider mb-2">
                NO ACTIVE TOURNAMENT
              </div>
              <p className="text-xs md:text-sm text-slate-600 tracking-wider leading-relaxed">
                Isolated tournaments with virtual cash and live market prices are next. Your
                account is ready.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
              <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">
                MARKET
              </div>
              <div className="text-sm md:text-base text-slate-400 tracking-wider mb-2">
                POKÉMON PRICES
              </div>
              <p className="text-xs md:text-sm text-slate-600 tracking-wider leading-relaxed">
                Packdraft stores normalized snapshots from PokemonPriceTracker. Trading UI ships
                after the tournament engine.
              </p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
