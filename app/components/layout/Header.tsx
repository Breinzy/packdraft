'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { tryCreateBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

const NAV = [
  { href: '/dashboard', label: 'DASHBOARD' },
  { href: '/assets', label: 'MARKET' },
  { href: '/tournaments', label: 'PLAY' },
  { href: '/settings', label: 'SETTINGS' },
];

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const client = tryCreateBrowserClient();
    if (!client) return;

    async function load(db: NonNullable<typeof client>) {
      const {
        data: { user: authUser },
      } = await db.auth.getUser();
      if (!authUser) return;
      setUser(authUser);
      const { data } = await db
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (data) setProfile(data as Profile);
    }

    load(client);
  }, []);

  async function handleSignOut() {
    const supabase = tryCreateBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/';
  }

  function getDisplayName(): string {
    if (profile?.display_name) return profile.display_name;
    if (user?.user_metadata?.display_name) return user.user_metadata.display_name as string;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }

  const isSignedIn = !!user;

  return (
    <>
      <header className="border-b border-border py-3 px-4 md:py-4 md:px-8 lg:px-16 flex items-center justify-between bg-background/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href={isSignedIn ? '/dashboard' : '/'} className="flex items-center gap-2 md:gap-3 min-h-11">
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

        <div className="hidden md:flex gap-8 items-center">
          <nav className="flex gap-6 items-center text-base tracking-wider">
            {NAV.map((item) => {
              if (!isSignedIn && item.href === '/settings') return null;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-11 inline-flex items-center transition-colors ${
                    active ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isSignedIn ? (
            <div className="flex items-center gap-4">
              <Link href="/settings" className="text-base text-accent-light tracking-wider hover:text-white transition-colors min-h-11 inline-flex items-center">
                {getDisplayName()}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm px-5 py-2 min-h-11 rounded-lg border border-white/[0.08] text-slate-500 hover:text-white hover:border-white/20 tracking-wider"
              >
                OUT
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center whitespace-nowrap text-base px-8 py-3 min-h-11 rounded-2xl font-bold tracking-widest text-white hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
                border: '2px solid rgba(110,155,207,0.3)',
              }}
            >
              SIGN IN
            </Link>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-3 min-h-11 min-w-11 items-center justify-center"
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-base font-bold tracking-[0.15em] text-white">PACKDRAFT</span>
            <button onClick={() => setMenuOpen(false)} className="p-3 min-h-11 min-w-11 text-slate-400 text-xl" aria-label="Close menu">
              ✕
            </button>
          </div>

          <nav className="flex flex-col py-4">
            {NAV.map((item) => {
              if (!isSignedIn && item.href === '/settings') return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-6 py-4 min-h-11 text-base tracking-widest text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto p-6 border-t border-white/[0.06] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {isSignedIn ? (
              <div className="space-y-4">
                <p className="text-sm text-accent-light tracking-wider">{getDisplayName()}</p>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMenuOpen(false);
                  }}
                  className="w-full text-sm py-3 min-h-11 rounded-lg border border-white/[0.08] text-slate-500 hover:text-white tracking-wider"
                >
                  SIGN OUT
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center py-4 min-h-11 rounded-xl text-base font-bold tracking-widest text-white"
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
