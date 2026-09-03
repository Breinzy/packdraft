"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  Layers,
  LayoutDashboard,
  Settings,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import {
  FUTURE_NAV,
  PRIMARY_NAV,
  isNavActive,
  type NavItem,
} from "@/components/layout/nav-config";
import type { SessionUser } from "@/lib/auth/use-session";
import { APP_HOME } from "@/lib/product/paths";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, LucideIcon> = {
  home: LayoutDashboard,
  portfolio: Wallet,
  market: TrendingUp,
  star: Star,
  layers: Layers,
  trophy: Trophy,
  events: Target,
  flask: FlaskConical,
  sparkles: Sparkles,
  settings: Settings,
};

export function SidebarNav({
  user,
  onNavigate,
}: {
  user: SessionUser | null;
  rank?: unknown;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center px-5">
        <Logo href={user ? APP_HOME : "/"} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Primary">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <PrimaryLink item={item} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <div className="mt-6 px-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Coming soon
          </span>
        </div>
        <ul className="mt-2 flex flex-col gap-0.5">
          {FUTURE_NAV.map((item) => (
            <li key={item.href}>
              <SoonLink item={item} onNavigate={onNavigate} />
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
        {user ? (
          <Link
            href="/settings"
            onClick={onNavigate}
            className="mt-3 flex items-center gap-2 rounded-lg px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="size-3.5" />
            Settings
          </Link>
        ) : (
          <div className="mt-3 flex items-center gap-3 px-1 text-xs font-semibold">
            <Link href="/auth/login" onClick={onNavigate} className="text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link href="/auth/signup" onClick={onNavigate} className="text-primary hover:text-foreground">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item);
  const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary-muted text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}

function SoonLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = NAV_ICONS[item.icon] ?? Sparkles;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/45 transition-colors hover:text-muted-foreground"
    >
      <Icon className="size-[18px]" strokeWidth={2} />
      {item.label}
      <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground/70">
        Soon
      </span>
    </Link>
  );
}
