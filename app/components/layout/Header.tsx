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
      <div className="page flex min-h-16 items-center justify-between gap-4 py-4">
        <Logo href={isSignedIn ? '/dashboard' : '/'} />
        <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Marketing">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-11 items-center ${
                  active ? 'font-medium text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {ready && isSignedIn ? (
            <Link href="/dashboard" className="btn btn-primary !h-10">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-ghost !h-10 hidden sm:inline-flex">
                Log in
              </Link>
              <Link href="/auth/signup" className="btn btn-primary !h-10">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
