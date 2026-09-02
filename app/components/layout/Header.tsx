'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/brand/Logo';
import { tryCreateBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets', label: 'Market' },
  { href: '/tournaments', label: 'Play' },
  { href: '/settings', label: 'Settings' },
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
      const { data } = await db.from('profiles').select('*').eq('id', authUser.id).single();
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
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="page flex items-center justify-between gap-4 min-h-14">
          <div className="flex items-center gap-3">
            <Logo href={isSignedIn ? '/dashboard' : '/'} />
            <span className="hidden sm:inline text-[11px] text-faint border border-border rounded px-1.5 py-0.5">
              Beta
            </span>
          </div>

          <div className="hidden md:flex gap-8 items-center">
            <nav className="flex gap-6 items-center text-sm">
              {NAV.map((item) => {
                if (!isSignedIn && item.href === '/settings') return null;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`min-h-11 inline-flex items-center ${
                      active
                        ? 'text-foreground font-medium'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`/players/${user.id}`}
                  className="text-sm text-muted hover:text-foreground min-h-11 inline-flex items-center"
                >
                  {getDisplayName()}
                </Link>
                <button onClick={handleSignOut} className="text-sm text-muted hover:text-foreground min-h-11">
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/auth/login" className="btn btn-primary">
                Sign in
              </Link>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2.5 min-h-11 min-w-11 items-center justify-center"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className={`block w-5 h-px bg-muted transition-transform ${menuOpen ? 'rotate-45 translate-y-[5px]' : ''}`} />
            <span className={`block w-5 h-px bg-muted transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-muted transition-transform ${menuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <div className="page flex items-center justify-between min-h-14 border-b border-border">
            <Logo href={null} />
            <button
              onClick={() => setMenuOpen(false)}
              className="p-3 min-h-11 min-w-11 text-muted text-lg"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="page flex flex-col py-2">
            {NAV.map((item) => {
              if (!isSignedIn && item.href === '/settings') return null;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`py-4 min-h-11 text-base ${active ? 'text-foreground' : 'text-muted'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="page mt-auto py-5 border-t border-border pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {isSignedIn ? (
              <div className="space-y-4">
                <Link
                  href={`/players/${user.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm text-muted min-h-11"
                >
                  {getDisplayName()}
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMenuOpen(false);
                  }}
                  className="btn btn-ghost w-full"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="btn btn-primary w-full">
                Sign in
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
