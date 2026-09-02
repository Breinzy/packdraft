import type { MarketEventStatus } from '@/types';

export function canEnterStatus(status: MarketEventStatus): boolean {
  return status === 'open';
}

export function isEventSettledStatus(status: MarketEventStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function isEventClosedStatus(status: MarketEventStatus): boolean {
  return (
    status === 'locked' ||
    status === 'settling' ||
    status === 'completed' ||
    status === 'cancelled'
  );
}

/**
 * Advance display status from wall-clock times. Completed/cancelled/settling stay put
 * until the scorer writes results (same idea as tournament tickStatus).
 */
export function tickEventStatus(
  status: MarketEventStatus,
  opensAt: Date | string,
  locksAt: Date | string,
  settlesAt: Date | string,
  now: Date = new Date()
): MarketEventStatus {
  if (status === 'cancelled' || status === 'completed' || status === 'settling') {
    return status;
  }

  const opens = opensAt instanceof Date ? opensAt : new Date(opensAt);
  const locks = locksAt instanceof Date ? locksAt : new Date(locksAt);
  const settles = settlesAt instanceof Date ? settlesAt : new Date(settlesAt);

  let next: MarketEventStatus = status;
  if (next === 'upcoming' && now.getTime() >= opens.getTime()) next = 'open';
  if (next === 'open' && now.getTime() >= locks.getTime()) next = 'locked';
  if (next === 'locked' && now.getTime() >= settles.getTime()) next = 'settling';
  return next;
}

export const MARKET_EVENT_STATUS_HELP: Record<MarketEventStatus, string> = {
  upcoming: 'Opens soon. Predictions are not open yet.',
  open: 'Submit a prediction. This does not use Career or tournament cash.',
  locked: 'Entries are closed. Waiting on settlement prices.',
  settling: 'Scores are being calculated.',
  completed: 'Results are locked and will not change.',
  cancelled: 'This event was cancelled. No scores.',
};
