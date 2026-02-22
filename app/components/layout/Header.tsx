'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Contest } from '@/types';
import { formatCountdown } from '@/lib/utils';

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [countdown, setCountdown] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }

      const { data: contestData } = await supabase
        .from('contests')
        .select('*')
        .in('status', ['pending', 'active'])
        .order('starts_at', { ascending: true })
        .limit(1)
        .single();
      if (contestData) setContest(contestData);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    if (!contest) return;
    const target = contest.status === 'pending' ? contest.starts_at : contest.ends_at;
    const update = () => setCountdown(formatCountdown(target));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [contest]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <header className="border-b border-border h-14 px-6 flex items-center justify-between bg-background/90 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-yellow-400 flex items-center justify-center text-sm font-bold">
            ⚡
          </div>
          <span className="text-sm font-bold tracking-[0.15em] text-white">PACKDRAFT</span>
        </Link>
        <span className="text-[10px] tracking-wider text-accent border border-accent/40 rounded px-1.5 py-0.5">
          BETA
        </span>
      </div>

      <div className="flex gap-6 items-center">
        {contest && (
          <div className="text-[11px] text-slate-500 tracking-wider">
            {contest.status === 'pending' ? 'STARTS IN' : 'WEEK'} ·{' '}
            <span className="text-gold">{countdown}</span>{' '}
            {contest.status === 'active' ? 'REMAINING' : ''}
          </div>
        )}

        <nav className="flex gap-4 items-center text-[11px] tracking-wider">
          <Link href="/draft" className="text-slate-400 hover:text-white transition-colors">
            DRAFT
          </Link>
          <Link href="/leaderboard" className="text-slate-400 hover:text-white transition-colors">
            LEADERBOARD
          </Link>
        </nav>

        {profile ? (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-accent-light tracking-wider">
              {profile.display_name || profile.email.split('@')[0]}
            </span>
            <button
              onClick={handleSignOut}
              className="text-[11px] px-3 py-1 rounded border border-white/[0.08] text-slate-500 hover:text-white hover:border-white/20 transition-all tracking-wider"
            >
              OUT
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="text-[11px] px-3 py-1 rounded bg-accent-dim border border-accent/30 text-accent-light tracking-wider hover:bg-accent/20 transition-all"
          >
            SIGN IN
          </Link>
        )}
      </div>
    </header>
  );
}
