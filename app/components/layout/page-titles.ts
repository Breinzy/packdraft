import type { BottomNavKey } from '@/components/layout/BottomNav';

export function titleForPath(pathname: string): { title: string; subtitle?: string } {
  if (pathname.startsWith('/dashboard')) {
    return { title: 'Dashboard', subtitle: 'Career book, live events, and rank' };
  }
  if (pathname.startsWith('/career/leaderboard')) {
    return { title: 'Career ranks', subtitle: 'Marked value of each Career book' };
  }
  if (pathname.startsWith('/career')) {
    return { title: 'My Portfolio', subtitle: 'Persistent Career book. Isolated from tournaments.' };
  }
  if (pathname.startsWith('/tournaments/')) {
    return { title: 'Tournament', subtitle: 'Isolated virtual book for this event' };
  }
  if (pathname.startsWith('/tournaments')) {
    return { title: 'Tournaments', subtitle: 'Isolated books. Virtual cash. Real market prices.' };
  }
  if (pathname.startsWith('/assets/')) {
    return { title: 'Markets', subtitle: 'Packdraft prices. Virtual trades only.' };
  }
  if (pathname.startsWith('/assets')) {
    return { title: 'Markets', subtitle: 'Browse Pokémon assets by Packdraft prices' };
  }
  if (pathname.startsWith('/events/')) {
    return { title: 'Event', subtitle: 'Independent of Career and tournament cash' };
  }
  if (pathname.startsWith('/events')) {
    return { title: 'Events', subtitle: 'Temporary predictions. Separate from portfolios.' };
  }
  if (pathname.startsWith('/social')) {
    return { title: 'Activity', subtitle: 'Friends, follows, and a feed' };
  }
  if (pathname.startsWith('/players/')) {
    return { title: 'Player', subtitle: 'Tournament record that persists across events' };
  }
  if (pathname.startsWith('/players')) {
    return { title: 'Rankings', subtitle: 'Settled tournament records' };
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Settings', subtitle: 'How you appear in tournaments' };
  }
  if (pathname.startsWith('/create')) {
    return { title: 'Host', subtitle: 'Creator tournaments use the same isolated books' };
  }
  if (pathname.startsWith('/releases')) {
    return { title: 'Releases', subtitle: 'Set-drop weekends. Still virtual. Still free.' };
  }
  if (pathname.startsWith('/creators')) {
    return { title: 'Creator', subtitle: 'Hosted tournaments and profile' };
  }
  return { title: 'Packdraft' };
}

export function defaultNavForPath(pathname: string): BottomNavKey | 'none' {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/assets')) return 'market';
  if (pathname.startsWith('/career')) return 'career';
  if (pathname.startsWith('/settings')) return 'settings';
  if (
    pathname.startsWith('/tournaments') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/releases') ||
    pathname.startsWith('/create')
  ) {
    return 'play';
  }
  return 'none';
}
