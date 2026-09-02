'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/brand/Logo';
import { useSession } from '@/lib/auth/use-session';

const NAV = [
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/assets', label: 'Markets' },
  { href: '/events', label: 'Events' },
];

export default function Header() {
  const { isSignedIn, ready } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="page flex min-h-[4.25rem] items-center justify-between gap-6 py-4 lg:min-h-[5rem] lg:py-5">
        <Logo href={isSignedIn ? '/dashboard' : '/'} />
        <nav className="hidden items-center gap-8 text-sm md:flex" aria-label="Marketing">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center py-2 ${
                  active ? 'font-medium text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {ready && isSignedIn ? (
            <Link href="/dashboard" className="btn btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-ghost hidden sm:inline-flex">
                Log in
              </Link>
              <Link href="/auth/signup" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
