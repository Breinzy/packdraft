import type { TournamentStatus } from '@/types';
import { canJoinStatus } from './lifecycle';

export interface JoinEligibilityInput {
  status: TournamentStatus;
  visibility: 'public' | 'private';
  inviteCode: string | null;
  providedInvite: string | null;
  createdBy: string | null;
  userId: string | null;
  entryMode: 'free';
  qualifierTournamentId: string | null;
  qualifierMaxRank: number;
  qualifierFinishRank: number | null;
}

export function joinBlockedReason(input: JoinEligibilityInput): string | null {
  if (!input.userId) return 'Not authenticated';
  if (!canJoinStatus(input.status)) return 'Tournament is not open to join';
  if (input.entryMode !== 'free') return 'Only free tournaments are open';

  if (input.visibility === 'private') {
    const host = input.createdBy === input.userId;
    const codeOk =
      Boolean(input.inviteCode) &&
      Boolean(input.providedInvite) &&
      input.inviteCode === input.providedInvite;
    if (!host && !codeOk) return 'Private tournament requires a valid invite';
  }

  if (input.qualifierTournamentId) {
    if (input.qualifierFinishRank == null || input.qualifierFinishRank > input.qualifierMaxRank) {
      return 'Qualifier finish required';
    }
  }

  return null;
}

export function canJoinTournament(input: JoinEligibilityInput): boolean {
  return joinBlockedReason(input) === null;
}
