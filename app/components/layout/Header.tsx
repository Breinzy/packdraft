'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Contest } from '@/types';
import { formatCountdown } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [countdown, setCountdown] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (data) setProfile(data);
      }

      const { data: contestData } = await supabase
        .from('contests')
        .select('*')
        .in('status', ['registration', 'pending', 'active'])
        .order('starts_at', { ascending: true })
        .limit(1)
        .single();
      if (contestData) setContest(contestData);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    if (!contest) return;
    const target = contest.status === 'active' ? contest.ends_at : contest.starts_at;
    const update = () => setCountdown(formatCountdown(target));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [contest]);

  function getStatusLabel() {
    if (!contest) return null;
    if (contest.status === 'registration') return { label: 'REGISTRATION OPEN', suffix: '' };
    if (contest.status === 'pending') return { label: 'LOCKS IN', suffix: '' };
    return { label: 'WEEK', suffix: 'REMAINING' };
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function getDisplayName(): string {
    if (profile?.display_name) return profile.display_name;
    if (user?.user_metadata?.display_name) return user.user_metadata.display_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }

  const status = getStatusLabel();
  const isSignedIn = !!user;

  return (
    <>
      <header className="border-b border-border py-3 px-4 md:py-4 md:px-16 flex items-center justify-between bg-background/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/" className="flex items-center gap-2 md:gap-3">
            <div
              className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-sm md:text-base font-bold"
              style={{ background: 'linear-gradient(135deg, #6e9bcf, #b0c4de)' }}
            >
              ⚡
            </div>
            <span className="text-base md:text-lg font-bold tracking-[0.15em] text-white">PACKDRAFT</span>
          </Link>
          <span className="text-[10px] md:text-xs tracking-wider text-accent border border-accent/40 rounded px-2 py-0.5 md:px-2.5 md:py-1">
            BETA
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-8 items-center">
          {contest && status && (
            <div className="text-base text-slate-500 tracking-wider">
              {status.label} ·{' '}
              <span className="text-accent-light">{countdown}</span>{' '}
              {status.suffix}
            </div>
          )}

          <nav className="flex gap-6 items-center text-base tracking-wider">
            {isSignedIn && (
              <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                DASHBOARD
              </Link>
            )}
            <Link href="/draft" className="text-slate-400 hover:text-white transition-colors">
              DRAFT
            </Link>
            <Link href="/leaderboard" className="text-slate-400 hover:text-white transition-colors">
              LEADERBOARD
            </Link>
            {isSignedIn && (
              <Link href="/admin" className="text-slate-600 hover:text-slate-400 transition-colors text-sm">
                ADMIN
              </Link>
            )}
          </nav>

          {isSignedIn ? (
            <div className="flex items-center gap-4">
              <Link href="/settings" className="text-base text-accent-light tracking-wider hover:text-white transition-colors">
                {getDisplayName()}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm px-5 py-2 rounded-lg border border-white/[0.08] text-slate-500 hover:text-white hover:border-white/20 tracking-wider"
              >
                OUT
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center whitespace-nowrap text-base px-12 py-5 rounded-2xl font-bold tracking-widest text-white hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
                border: '2px solid rgba(110,155,207,0.3)',
              }}
            >
              SIGN IN
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-base font-bold tracking-[0.15em] text-white">PACKDRAFT</span>
            <button onClick={() => setMenuOpen(false)} className="p-2 text-slate-400 text-xl">
              ✕
            </button>
          </div>

          {contest && status && (
            <div className="px-6 py-4 text-sm text-slate-500 tracking-wider border-b border-white/[0.06]">
              {status.label} · <span className="text-accent-light">{countdown}</span> {status.suffix}
            </div>
          )}

          <nav className="flex flex-col py-4">
            {isSignedIn && (
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="px-6 py-4 text-base tracking-widest text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors"
              >
                DASHBOARD
              </Link>
            )}
            <Link
              href="/draft"
              onClick={() => setMenuOpen(false)}
              className="px-6 py-4 text-base tracking-widest text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors"
            >
              DRAFT
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMenuOpen(false)}
              className="px-6 py-4 text-base tracking-widest text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors"
            >
              LEADERBOARD
            </Link>
          </nav>

          <div className="mt-auto p-6 border-t border-white/[0.06]">
            {isSignedIn ? (
              <div className="space-y-4">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm text-accent-light tracking-wider hover:text-white transition-colors"
                >
                  {getDisplayName()} · SETTINGS
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMenuOpen(false); }}
                  className="w-full text-sm py-3 rounded-lg border border-white/[0.08] text-slate-500 hover:text-white tracking-wider"
                >
                  SIGN OUT
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center py-4 rounded-xl text-base font-bold tracking-widest text-white"
                style={{
                  background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
                  border: '2px solid rgba(110,155,207,0.3)',
                }}
              >
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
