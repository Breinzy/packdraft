import Link from 'next/link';

export type BottomNavKey = 'dashboard' | 'market' | 'play' | 'settings';

interface BottomNavProps {
  active: BottomNavKey;
}

export default function BottomNav({ active }: BottomNavProps) {
  const items = [
    { href: '/dashboard', key: 'dashboard' as const, label: 'HOME' },
    { href: '/assets', key: 'market' as const, label: 'MARKET' },
    { href: '/tournaments', key: 'play' as const, label: 'PLAY' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-3">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center justify-center min-h-14 text-xs tracking-widest font-bold ${
                isActive ? 'text-white' : 'text-slate-500'
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
