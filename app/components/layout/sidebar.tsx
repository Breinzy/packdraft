"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { GENERAL_NAV, MENU_NAV, isNavActive, type NavItem } from "@/components/layout/nav-config";
import { Icon } from "@/components/icons";
import type { SessionUser } from "@/lib/auth/use-session";
import type { RankSummary } from "@/lib/auth/use-account-chrome";

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
  const menu = MENU_NAV.filter((item) => !item.auth || user);
  const general = GENERAL_NAV.filter((item) => !item.auth || user);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 pb-8 pt-7">
        <Logo href={user ? "/dashboard" : "/"} compact />
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-6" aria-label="Primary">
        <p className="label-caps px-3 pb-3">Menu</p>
        <ul className="space-y-1">
          {menu.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <p className="label-caps mt-8 px-3 pb-3">General</p>
        <ul className="space-y-1">
          {general.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      {user ? (
        <div className="mx-4 mb-5 rounded-[var(--radius-lg)] border border-border bg-surface-2 p-4">
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
                    Rank #{rank.rank}
                    {rank.percentileLabel ? ` · ${rank.percentileLabel}` : ""}
                  </>
                ) : (
                  "Career account"
                )}
              </span>
            </span>
          </Link>
        </div>
      ) : (
        <div className="mx-4 mb-5 space-y-2">
          <Link href="/auth/login" onClick={onNavigate} className="btn btn-ghost w-full">
            Log in
          </Link>
          <Link href="/auth/signup" onClick={onNavigate} className="btn btn-primary w-full">
            Sign up
          </Link>
        </div>
      )}
    </div>
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
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? "nav-active text-foreground"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      <Icon name={item.icon} className={active ? "h-[18px] w-[18px] text-accent" : "h-[18px] w-[18px] text-muted"} />
      <span className="flex-1">{item.label}</span>
      {active ? <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> : null}
    </Link>
  );
}
