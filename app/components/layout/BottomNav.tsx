import Link from 'next/link';
import { Icon } from '@/components/icons';
import { PRIMARY_NAV, isNavActive, type BottomNavKey } from '@/components/layout/nav-config';

export type { BottomNavKey };

export default function BottomNav({ pathname }: { pathname: string; active?: BottomNavKey }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary mobile"
    >
      <ul className="flex items-stretch justify-around">
        {PRIMARY_NAV.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[10px] font-semibold ${
                  active ? 'text-accent-light' : 'text-faint'
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`h-[22px] w-[22px] ${active ? 'text-accent' : 'text-faint'}`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
