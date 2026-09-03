import Link from "next/link";
import {
  Layers,
  LayoutDashboard,
  Star,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PRIMARY_NAV, isNavActive, type BottomNavKey } from "@/components/layout/nav-config";

export type { BottomNavKey };

const ICONS: Record<string, LucideIcon> = {
  home: LayoutDashboard,
  portfolio: Wallet,
  market: TrendingUp,
  star: Star,
  layers: Layers,
};

export default function BottomNav({ pathname }: { pathname: string; active?: BottomNavKey }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Primary mobile"
    >
      <ul className="flex items-stretch justify-around">
        {PRIMARY_NAV.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[10px] font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
