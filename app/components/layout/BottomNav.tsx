import Link from 'next/link';

export type BottomNavKey = 'dashboard' | 'market' | 'play' | 'settings';

export default function BottomNav({ active }: { active: BottomNavKey }) {
  const items = [
    { href: '/dashboard', key: 'dashboard' as const, label: 'Home' },
    { href: '/assets', key: 'market' as const, label: 'Market' },
    { href: '/tournaments', key: 'play' as const, label: 'Play' },
  ];

  return (
    <nav className="md:hidden dock">
      <div className="grid grid-cols-3 px-1">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center justify-center min-h-14 text-xs font-medium ${
                isActive ? 'text-foreground' : 'text-faint'
              }`}
            >
              <span
                className={`inline-flex min-h-8 items-center border-b-2 ${
                  isActive ? 'border-accent' : 'border-transparent'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
