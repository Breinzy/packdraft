"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import {
  COMPETE_NAV,
  GENERAL_NAV,
  PRACTICE_NAV,
  PRIMARY_NAV,
  isNavActive,
  type NavItem,
} from "@/components/layout/nav-config";
import { Icon } from "@/components/icons";
import type { SessionUser } from "@/lib/auth/use-session";
import type { RankSummary } from "@/lib/auth/use-account-chrome";
import { APP_HOME } from "@/lib/product/paths";

export function SidebarNav({
  user,
  rank,
  onNavigate,
}: {
  user: SessionUser | null;
  rank: RankSummary;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const primary = PRIMARY_NAV.filter((item) => !item.auth || user);
  const compete = COMPETE_NAV.filter((item) => !item.auth || user);
  const practice = PRACTICE_NAV.filter((item) => !item.auth || user);
  const general = GENERAL_NAV.filter((item) => !item.auth || user);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center px-5">
        <Logo href={user ? APP_HOME : "/"} compact />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Primary">
        <NavGroup items={primary} pathname={pathname} onNavigate={onNavigate} />

        <p className="mt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-faint">
          Compete
        </p>
        <NavGroup items={compete} pathname={pathname} onNavigate={onNavigate} />

        <p className="mt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-faint">
          Practice
        </p>
        <NavGroup items={practice} pathname={pathname} onNavigate={onNavigate} />

        {general.length > 0 ? (
          <>
            <p className="mt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-faint">
              Account
            </p>
            <NavGroup items={general} pathname={pathname} onNavigate={onNavigate} />
          </>
        ) : null}
      </nav>

      {user ? (
        <div className="mx-3 mb-3 rounded-[var(--radius-lg)] border border-sidebar-border bg-surface-2 p-3">
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-[var(--radius-md)] outline-none"
          >
            <span className="avatar h-10 w-10 text-sm">{user.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{user.displayName}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {rank.rank != null ? (
                  <>
                    Sandbox #{rank.rank}
                    {rank.percentileLabel ? ` · ${rank.percentileLabel}` : ""}
                  </>
                ) : (
                  "Collector account"
                )}
              </span>
            </span>
          </Link>
        </div>
      ) : (
        <div className="mx-3 mb-3 space-y-2">
          <Link href="/auth/login" onClick={onNavigate} className="btn btn-ghost w-full">
            Log in
          </Link>
          <Link href="/auth/signup" onClick={onNavigate} className="btn btn-primary w-full">
            Sign up
          </Link>
        </div>
      )}

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-green" />
            </span>
            <span className="text-xs font-medium text-muted">Market data live</span>
          </div>
          <span className="num text-[11px] font-medium text-faint">TCG · USD</span>
        </div>
      </div>
    </div>
  );
}

function NavGroup({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.href}>
          <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item);
  if (item.soon) {
    return (
      <div className="flex cursor-not-allowed items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-faint">
        <Icon name={item.icon} className="h-[18px] w-[18px] text-faint" />
        <span className="flex-1">{item.label}</span>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-faint">
          Soon
        </span>
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? "bg-accent-dim text-accent-light"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      <Icon name={item.icon} className={active ? "h-[18px] w-[18px] text-accent" : "h-[18px] w-[18px] text-muted"} />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}
