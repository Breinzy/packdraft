import type { BottomNavKey } from '@/components/layout/BottomNav';

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  auth?: boolean;
  match?: 'exact' | 'prefix';
};

export type NavIconName =
  | 'home'
  | 'portfolio'
  | 'trophy'
  | 'market'
  | 'activity'
  | 'events'
  | 'settings'
  | 'users'
  | 'plus';

export const MENU_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home', auth: true, match: 'prefix' },
  { href: '/career', label: 'My Portfolio', icon: 'portfolio', auth: true, match: 'prefix' },
  { href: '/tournaments', label: 'Tournaments', icon: 'trophy', match: 'prefix' },
  { href: '/assets', label: 'Markets', icon: 'market', match: 'prefix' },
  { href: '/events', label: 'Events', icon: 'events', match: 'prefix' },
  { href: '/social', label: 'Activity', icon: 'activity', auth: true, match: 'prefix' },
];

export const GENERAL_NAV: NavItem[] = [
  { href: '/players', label: 'Rankings', icon: 'users', match: 'prefix' },
  { href: '/settings', label: 'Settings', icon: 'settings', auth: true, match: 'prefix' },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function navKeyToHref(nav: BottomNavKey | 'none'): string | null {
  if (nav === 'dashboard') return '/dashboard';
  if (nav === 'market') return '/assets';
  if (nav === 'play') return '/tournaments';
  if (nav === 'career') return '/career';
  if (nav === 'settings') return '/settings';
  return null;
}
