import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import type { Profile, Contest, League, Portfolio } from '@/types';
import { formatCountdown, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Safety net: ensure profile exists even if trigger failed
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

  // Fetch current contest
  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .in('status', ['registration', 'pending', 'active'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .single();

  // Fetch last completed contest for results link
  const { data: lastCompleted } = await supabase
    .from('contests')
    .select('id, ends_at')
    .eq('status', 'complete')
    .order('ends_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch league if assigned
  let league: League | null = null;
  if (profile?.current_league_id) {
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', profile.current_league_id)
      .single();
    league = data;
  }

  // Fetch portfolio for current contest
  let portfolio: Portfolio | null = null;
  let portfolioItemCount = 0;
  if (contest) {
    const { data } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .eq('contest_id', contest.id)
      .limit(1)
      .single();
    portfolio = data;

    if (portfolio) {
      const { count } = await supabase
        .from('portfolio_items')
        .select('*', { count: 'exact', head: true })
        .eq('portfolio_id', portfolio.id);
      portfolioItemCount = count ?? 0;
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <WelcomeBanner profile={profile as Profile} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContestCard contest={contest} />
            <LeagueCard league={league} />
          </div>
          <PortfolioCard
            portfolio={portfolio}
            itemCount={portfolioItemCount}
            hasContest={!!contest}
          />
          <QuickActions lastCompletedContestId={lastCompleted?.id ?? null} />
        </div>
      </main>
    </>
  );
}

function WelcomeBanner({ profile }: { profile: Profile }) {
  const name = profile.display_name || profile.email.split('@')[0];
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
      <h1 className="text-lg md:text-2xl font-bold tracking-widest text-white mb-1 md:mb-2">
        WELCOME BACK, {name.toUpperCase()}
      </h1>
      <p className="text-xs md:text-sm text-slate-500 tracking-wider">
        {profile.email}
      </p>
    </div>
  );
}

function ContestCard({ contest }: { contest: Contest | null }) {
  if (!contest) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
        <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">CONTEST</div>
        <div className="text-3xl mb-4">📅</div>
        <div className="text-sm md:text-base text-slate-400 tracking-wider mb-1">NO ACTIVE CONTEST</div>
        <div className="text-xs md:text-sm text-slate-600 tracking-wider">
          Check back Sunday for the next registration window.
        </div>
      </div>
    );
  }

  const phaseLabels: Record<string, string> = {
    registration: 'REGISTRATION OPEN',
    pending: 'PENDING START',
    active: 'CONTEST ACTIVE',
  };

  const phaseColors: Record<string, string> = {
    registration: '#34d399',
    pending: '#fbbf24',
    active: '#6e9bcf',
  };

  const target = contest.status === 'active' ? contest.ends_at : contest.starts_at;
  const countdown = formatCountdown(target);
  const suffix = contest.status === 'active' ? 'REMAINING' : 'UNTIL START';

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
      <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">CONTEST</div>
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: phaseColors[contest.status] ?? '#6e9bcf' }}
        />
        <span
          className="text-xs md:text-sm font-bold tracking-widest"
          style={{ color: phaseColors[contest.status] ?? '#6e9bcf' }}
        >
          {phaseLabels[contest.status] ?? contest.status.toUpperCase()}
        </span>
      </div>
      <div className="text-xl md:text-2xl font-bold text-accent-light tracking-wider mb-1">
        {countdown}
      </div>
      <div className="text-[10px] md:text-xs text-slate-600 tracking-widest">
        {suffix}
      </div>
    </div>
  );
}

function LeagueCard({ league }: { league: League | null }) {
  if (!league) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
        <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">LEAGUE</div>
        <div className="text-3xl mb-4">🏆</div>
        <div className="text-sm md:text-base text-slate-400 tracking-wider mb-1">NO LEAGUE YET</div>
        <div className="text-xs md:text-sm text-slate-600 tracking-wider">
          You&apos;ll be auto-assigned when a contest opens.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
      <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">LEAGUE</div>
      <div className="text-lg md:text-xl font-bold text-white tracking-wider mb-2 md:mb-3">
        {league.name}
      </div>
      <div className="flex gap-6">
        <div>
          <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-1">PLAYERS</div>
          <div className="text-base md:text-lg font-bold text-accent-light">{league.player_count}/{league.max_players}</div>
        </div>
        <div>
          <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-1">STATUS</div>
          <div className="text-base md:text-lg font-bold text-green">
            {league.is_full ? 'FULL' : 'OPEN'}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioCard({
  portfolio,
  itemCount,
  hasContest,
}: {
  portfolio: Portfolio | null;
  itemCount: number;
  hasContest: boolean;
}) {
  if (!hasContest) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
        <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">PORTFOLIO</div>
        <div className="text-xs md:text-sm text-slate-500 tracking-wider">
          No active contest — portfolios open during registration.
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
        <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">PORTFOLIO</div>
        <div className="text-3xl mb-4">📋</div>
        <div className="text-sm md:text-base text-slate-400 tracking-wider mb-2">NO PORTFOLIO YET</div>
        <div className="text-xs md:text-sm text-slate-600 tracking-wider mb-6">
          Head to the draft to start building.
        </div>
        <Link
          href="/draft"
          className="inline-flex items-center justify-center px-6 md:px-8 py-3 rounded-xl text-sm font-bold tracking-widest text-white"
          style={{
            background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
            border: '2px solid rgba(110,155,207,0.3)',
          }}
        >
          START DRAFTING
        </Link>
      </div>
    );
  }

  const budgetUsed = 5000 - Number(portfolio.cash_remaining);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
      <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-3 md:mb-4">PORTFOLIO</div>
      <div className="grid grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
        <div>
          <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-1">ITEMS</div>
          <div className="text-lg md:text-xl font-bold text-white">{itemCount}</div>
        </div>
        <div>
          <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-1">SPENT</div>
          <div className="text-lg md:text-xl font-bold text-accent-light">{formatCurrency(budgetUsed)}</div>
        </div>
        <div>
          <div className="text-[10px] md:text-xs text-slate-600 tracking-widest mb-1">REMAINING</div>
          <div className="text-lg md:text-xl font-bold text-green">
            {formatCurrency(Number(portfolio.cash_remaining))}
          </div>
        </div>
      </div>
      {portfolio.is_locked ? (
        <div className="text-xs md:text-sm text-gold tracking-widest">
          LOCKED — CONTEST IN PROGRESS
        </div>
      ) : (
        <Link
          href="/draft"
          className="inline-flex items-center justify-center px-6 md:px-8 py-3 rounded-xl text-sm font-bold tracking-widest text-white"
          style={{
            background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
            border: '2px solid rgba(110,155,207,0.3)',
          }}
        >
          EDIT PORTFOLIO
        </Link>
      )}
    </div>
  );
}

function QuickActions({ lastCompletedContestId }: { lastCompletedContestId: string | null }) {
  return (
    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4">
      <Link
        href="/draft"
        className="md:flex-1 md:min-w-[180px] bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 md:px-6 py-4 md:py-5 text-center hover:bg-white/[0.06] transition-colors"
      >
        <div className="text-lg mb-1">⚡</div>
        <div className="text-xs md:text-sm font-bold text-white tracking-widest">ENTER DRAFT</div>
      </Link>
      <Link
        href="/leaderboard"
        className="md:flex-1 md:min-w-[180px] bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 md:px-6 py-4 md:py-5 text-center hover:bg-white/[0.06] transition-colors"
      >
        <div className="text-lg mb-1">📊</div>
        <div className="text-xs md:text-sm font-bold text-white tracking-widest">LEADERBOARD</div>
      </Link>
      {lastCompletedContestId ? (
        <Link
          href={`/results/${lastCompletedContestId}`}
          className="col-span-2 md:flex-1 md:min-w-[180px] bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 md:px-6 py-4 md:py-5 text-center hover:bg-white/[0.06] transition-colors"
        >
          <div className="text-lg mb-1">🏆</div>
          <div className="text-xs md:text-sm font-bold text-white tracking-widest">LAST RESULTS</div>
        </Link>
      ) : (
        <div className="col-span-2 md:flex-1 md:min-w-[180px] bg-white/[0.03] border border-white/[0.04] rounded-xl px-4 md:px-6 py-4 md:py-5 text-center opacity-40 cursor-not-allowed">
          <div className="text-lg mb-1">🏆</div>
          <div className="text-xs md:text-sm font-bold text-slate-500 tracking-widest">RESULTS</div>
          <div className="text-[10px] md:text-xs text-slate-700 tracking-wider mt-1">NO COMPLETED CONTESTS</div>
        </div>
      )}
    </div>
  );
}
