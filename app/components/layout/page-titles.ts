import type { BottomNavKey } from '@/components/layout/nav-config';

export function titleForPath(pathname: string): { title: string; subtitle?: string } {
  if (pathname.startsWith('/overview') || pathname.startsWith('/dashboard')) {
    return { title: 'Overview', subtitle: 'Collection, market, and competition at a glance' };
  }
  if (pathname.startsWith('/portfolio')) {
    return { title: 'Portfolio', subtitle: 'Track the Pokémon you actually own' };
  }
  if (pathname.startsWith('/watchlist')) {
    return { title: 'Watchlist', subtitle: 'Research queue before you buy' };
  }
  if (pathname.startsWith('/sets/')) {
    return { title: 'Set', subtitle: 'Cards and sealed from this expansion' };
  }
  if (pathname.startsWith('/sets')) {
    return { title: 'Sets', subtitle: 'Browse Pokémon expansions' };
  }
  if (pathname.startsWith('/market')) {
    return { title: 'Market', subtitle: 'Pokémon prices stored by Packdraft' };
  }
  if (pathname.startsWith('/sandbox/leaderboard') || pathname.startsWith('/career/leaderboard')) {
    return { title: 'Sandbox ranks', subtitle: 'Marked value of each virtual book' };
  }
  if (pathname.startsWith('/sandbox') || pathname.startsWith('/career')) {
    return { title: 'Sandbox', subtitle: 'Virtual $1,000 book. Isolated from your collection and from tournaments.' };
  }
  if (pathname.startsWith('/tournaments/')) {
    return { title: 'Tournament', subtitle: 'Isolated virtual book for this event' };
  }
  if (pathname.startsWith('/tournaments')) {
    return { title: 'Tournaments', subtitle: 'Compete on real Pokémon market movement' };
  }
  if (pathname.startsWith('/assets/')) {
    return { title: 'Asset', subtitle: 'Packdraft price. Virtual trades do not move the real market.' };
  }
  if (pathname.startsWith('/assets')) {
    return { title: 'Market', subtitle: 'Browse Pokémon assets by Packdraft prices' };
  }
  if (pathname.startsWith('/events/') || pathname.startsWith('/predictions/')) {
    return { title: 'Prediction', subtitle: 'Independent of collection, sandbox, and tournament cash' };
  }
  if (pathname.startsWith('/events') || pathname.startsWith('/predictions')) {
    return { title: 'Predictions', subtitle: 'Call the Pokémon market. Build a skill record.' };
  }
  if (pathname.startsWith('/pro')) {
    return { title: 'Packdraft Pro', subtitle: 'Intelligence on your actual holdings. Not a paywall on tracking.' };
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
    return { title: 'Settings', subtitle: 'How you appear on Packdraft' };
  }
  if (pathname.startsWith('/create')) {
    return { title: 'Host', subtitle: 'Creator tournaments use isolated books' };
  }
  if (pathname.startsWith('/releases')) {
    return { title: 'Releases', subtitle: 'Set-drop weekends' };
  }
  if (pathname.startsWith('/creators')) {
    return { title: 'Creator', subtitle: 'Hosted tournaments and profile' };
  }
  return { title: 'Packdraft' };
}

export function defaultNavForPath(pathname: string): BottomNavKey | 'none' {
  if (pathname.startsWith('/overview') || pathname.startsWith('/dashboard')) return 'overview';
  if (pathname.startsWith('/portfolio')) return 'portfolio';
  if (pathname.startsWith('/watchlist')) return 'watchlist';
  if (pathname.startsWith('/sets')) return 'sets';
  if (pathname.startsWith('/assets') || pathname.startsWith('/market')) return 'market';
  if (pathname.startsWith('/sandbox') || pathname.startsWith('/career')) return 'sandbox';
  if (pathname.startsWith('/settings')) return 'settings';
  if (
    pathname.startsWith('/tournaments') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/predictions') ||
    pathname.startsWith('/releases') ||
    pathname.startsWith('/create')
  ) {
    return 'play';
  }
  return 'none';
}
