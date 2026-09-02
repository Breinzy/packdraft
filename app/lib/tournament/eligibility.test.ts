import { describe, expect, it } from 'vitest';
import { canJoinTournament, joinBlockedReason } from './eligibility';

const base = {
  status: 'active' as const,
  visibility: 'public' as const,
  inviteCode: null,
  providedInvite: null,
  createdBy: 'host',
  userId: 'player',
  entryMode: 'free' as const,
  qualifierTournamentId: null,
  qualifierMaxRank: 3,
  qualifierFinishRank: null,
};

describe('join eligibility', () => {
  it('allows a free public tournament', () => {
    expect(canJoinTournament(base)).toBe(true);
  });

  it('rejects a private book without the invite', () => {
    expect(
      joinBlockedReason({
        ...base,
        visibility: 'private',
        inviteCode: 'secret',
        providedInvite: null,
      })
    ).toMatch(/invite/);
  });

  it('allows the host into a private book', () => {
    expect(
      canJoinTournament({
        ...base,
        visibility: 'private',
        inviteCode: 'secret',
        userId: 'host',
      })
    ).toBe(true);
  });

  it('requires a qualifier finish at or above the cutoff', () => {
    expect(
      joinBlockedReason({
        ...base,
        qualifierTournamentId: 'q1',
        qualifierFinishRank: 4,
        qualifierMaxRank: 3,
      })
    ).toMatch(/Qualifier/);
    expect(
      canJoinTournament({
        ...base,
        qualifierTournamentId: 'q1',
        qualifierFinishRank: 2,
        qualifierMaxRank: 3,
      })
    ).toBe(true);
  });
});
