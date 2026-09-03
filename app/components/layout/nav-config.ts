import {
  APP_HOME,
  COLLECTION_PATH,
  MARKET_PATH,
  PREDICTIONS_PATH,
  PRO_PATH,
  SANDBOX_PATH,
  SETS_PATH,
  TOURNAMENTS_PATH,
  WATCHLIST_PATH,
} from '@/lib/product/paths';

export type BottomNavKey =
  | 'overview'
  | 'dashboard'
  | 'market'
  | 'portfolio'
  | 'watchlist'
  | 'sets'
  | 'play'
  | 'sandbox'
  | 'career'
  | 'settings';

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  auth?: boolean;
  match?: 'exact' | 'prefix';
  soon?: boolean;
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
  | 'plus'
  | 'star'
  | 'layers'
  | 'flask'
  | 'sparkles';

export const PRIMARY_NAV: NavItem[] = [
  { href: APP_HOME, label: 'Overview', icon: 'home', match: 'exact' },
  { href: COLLECTION_PATH, label: 'Portfolio', icon: 'portfolio', match: 'prefix' },
  { href: MARKET_PATH, label: 'Market', icon: 'market', match: 'prefix' },
  { href: WATCHLIST_PATH, label: 'Watchlist', icon: 'star', match: 'prefix' },
  { href: SETS_PATH, label: 'Sets', icon: 'layers', match: 'prefix' },
];

export const COMPETE_NAV: NavItem[] = [
  { href: TOURNAMENTS_PATH, label: 'Tournaments', icon: 'trophy', match: 'prefix' },
  { href: PREDICTIONS_PATH, label: 'Predictions', icon: 'events', match: 'prefix' },
];

export const PRACTICE_NAV: NavItem[] = [
  { href: SANDBOX_PATH, label: 'Sandbox', icon: 'flask', match: 'prefix' },
  { href: PRO_PATH, label: 'Pro', icon: 'sparkles', match: 'prefix' },
];

export const GENERAL_NAV: NavItem[] = [
  { href: '/players', label: 'Rankings', icon: 'users', match: 'prefix' },
  { href: '/settings', label: 'Settings', icon: 'settings', auth: true, match: 'prefix' },
];

/** @deprecated Use PRIMARY_NAV / COMPETE_NAV. Kept for older imports. */
export const MENU_NAV: NavItem[] = [...PRIMARY_NAV, ...COMPETE_NAV];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === 'exact' || item.href === APP_HOME) {
    return pathname === item.href || pathname === '/dashboard';
  }
  if (item.href === MARKET_PATH) {
    return pathname === MARKET_PATH || pathname.startsWith(`${MARKET_PATH}/`) || pathname.startsWith('/assets');
  }
  if (item.href === SANDBOX_PATH) {
    return pathname.startsWith(SANDBOX_PATH) || pathname.startsWith('/career');
  }
  if (item.href === PREDICTIONS_PATH) {
    return pathname.startsWith(PREDICTIONS_PATH) || pathname.startsWith('/predictions');
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function navKeyToHref(nav: BottomNavKey | 'none'): string | null {
  if (nav === 'overview' || nav === 'dashboard') return APP_HOME;
  if (nav === 'market') return MARKET_PATH;
  if (nav === 'portfolio') return COLLECTION_PATH;
  if (nav === 'watchlist') return WATCHLIST_PATH;
  if (nav === 'sets') return SETS_PATH;
  if (nav === 'play') return TOURNAMENTS_PATH;
  if (nav === 'sandbox' || nav === 'career') return SANDBOX_PATH;
  if (nav === 'settings') return '/settings';
  return null;
}
