'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Star,
  Layers,
  Trophy,
  Target,
  FlaskConical,
  Sparkles,
  Search,
  Plus,
  Command,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/ui'
import { cn } from '@/lib/utils'

const PRIMARY_NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: Wallet },
  { href: '/market', label: 'Market', icon: TrendingUp },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/sets', label: 'Sets', icon: Layers },
]

const FUTURE_NAV = [
  { label: 'Tournaments', icon: Trophy },
  { label: 'Predictions', icon: Target },
  { label: 'Sandbox', icon: FlaskConical },
]

const MOBILE_NAV = PRIMARY_NAV

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-base font-black leading-none">P</span>
      </span>
      {!compact && (
        <span className="text-[15px] font-bold tracking-tight text-foreground">
          Packdraft
        </span>
      )}
    </Link>
  )
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

/* ------------------------------- Sidebar ------------------------------- */

function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-muted text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <item.icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-4">
          <Link
            href="/pro"
            className={cn(
              'group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive(pathname, '/pro')
                ? 'border-primary/40 bg-primary-muted text-primary'
                : 'border-primary/25 bg-primary-muted/40 text-primary hover:bg-primary-muted',
            )}
          >
            <Sparkles className="size-[18px]" strokeWidth={2.2} />
            Pro
            <span className="ml-auto rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
              Upgrade
            </span>
          </Link>
        </div>

        <div className="mt-6 px-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Coming soon
          </span>
        </div>
        <ul className="mt-2 flex flex-col gap-0.5">
          {FUTURE_NAV.map((item) => (
            <li key={item.label}>
              <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/45">
                <item.icon className="size-[18px]" strokeWidth={2} />
                {item.label}
                <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70">
                  Soon
                </span>
              </div>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-positive" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Market data live</span>
          </div>
          <span className="tabular text-[11px] font-medium text-muted-foreground/70">TCG · USD</span>
        </div>
      </div>
    </aside>
  )
}

/* -------------------------------- Topbar -------------------------------- */

function Topbar() {
  const { openSearch, openAdd } = useUI()
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <div className="lg:hidden">
          <Logo compact />
        </div>

        <button
          type="button"
          onClick={openSearch}
          className="group flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong hover:bg-card-elevated lg:max-w-md"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">Search cards, sealed, sets...</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
            <Command className="size-2.5" />K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/pro"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-muted/50 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-muted"
          >
            <Sparkles className="size-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Pro</span>
            <span className="sr-only sm:hidden">Upgrade to Pro</span>
          </Link>
          <Button onClick={() => openAdd()} size="sm" className="h-10 gap-1.5 rounded-xl font-semibold">
            <Plus className="size-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Add to collection</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

/* ----------------------------- Mobile bottom ---------------------------- */

function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="flex items-stretch justify-around">
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[10px] font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
