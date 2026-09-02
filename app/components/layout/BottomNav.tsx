import Link from 'next/link';
import { Icon } from '@/components/icons';

export type BottomNavKey = 'dashboard' | 'market' | 'play' | 'career' | 'settings';

const ITEMS: { href: string; key: BottomNavKey; label: string; icon: 'home' | 'market' | 'trophy' | 'portfolio' }[] = [
  { href: '/dashboard', key: 'dashboard', label: 'Home', icon: 'home' },
  { href: '/assets', key: 'market', label: 'Market', icon: 'market' },
  { href: '/tournaments', key: 'play', label: 'Play', icon: 'trophy' },
  { href: '/career', key: 'career', label: 'Career', icon: 'portfolio' },
];

export default function BottomNav({ active }: { active: BottomNavKey }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary mobile"
    >
      <div className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1.5 text-[11px] ${
                isActive ? 'text-foreground font-semibold' : 'text-faint font-medium'
              }`}
            >
              <Icon
                name={item.icon}
                className={`h-[18px] w-[18px] ${isActive ? 'text-accent' : 'text-faint'}`}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
