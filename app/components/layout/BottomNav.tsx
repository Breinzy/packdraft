import Link from 'next/link';

export type BottomNavKey = 'dashboard' | 'market' | 'play' | 'settings';

export default function BottomNav({ active }: { active: BottomNavKey }) {
  const items = [
    { href: '/dashboard', key: 'dashboard' as const, label: 'Home' },
    { href: '/assets', key: 'market' as const, label: 'Market' },
    { href: '/tournaments', key: 'play' as const, label: 'Play' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-3">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center justify-center min-h-14 text-sm ${
                isActive ? 'text-foreground font-semibold' : 'text-faint font-medium'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
