import type { TournamentStatus } from '@/types';

export function canJoinStatus(status: TournamentStatus): boolean {
  return status === 'upcoming' || status === 'active';
}

export function canTradeStatus(status: TournamentStatus): boolean {
  return status === 'active';
}

export function isSettledStatus(status: TournamentStatus): boolean {
  return status === 'completed' || status === 'archived';
}

export function isClosedStatus(status: TournamentStatus): boolean {
  return (
    status === 'locked' ||
    status === 'settling' ||
    status === 'completed' ||
    status === 'archived'
  );
}

/**
 * Advance status from wall-clock times. Completed/archived/settling are sticky.
 * SQL `tick_tournament_row` is authoritative; this mirrors it for tests and UI.
 */
export function tickStatus(
  status: TournamentStatus,
  startsAt: Date | string,
  tradingClosesAt: Date | string,
  now: Date = new Date()
): TournamentStatus {
  if (status === 'archived' || status === 'completed' || status === 'settling') {
    return status;
  }

  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const close = tradingClosesAt instanceof Date ? tradingClosesAt : new Date(tradingClosesAt);

  let next: TournamentStatus = status;
  if (next === 'upcoming' && now.getTime() >= start.getTime()) {
    next = 'active';
  }
  if (next === 'active' && now.getTime() >= close.getTime()) {
    next = 'locked';
  }
  return next;
}

export function valuationAsOf(
  status: TournamentStatus,
  tradingClosesAt: string,
  now: Date = new Date()
): Date {
  if (isClosedStatus(status)) return new Date(tradingClosesAt);
  return now;
}

export const TOURNAMENT_STATUS_HELP: Record<TournamentStatus, string> = {
  upcoming: 'Opens soon. Join now to get your starting cash.',
  active: 'Trading is open. Highest portfolio value wins.',
  locked: 'Trading is closed. Settlement prices are being frozen.',
  settling: 'Final values are being calculated.',
  completed: 'Results are locked and will not change.',
  archived: 'Historical result.',
};
