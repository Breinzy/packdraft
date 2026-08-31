import { describe, expect, it } from 'vitest';
import { parseCreateTournamentInput } from './admin';

describe('parseCreateTournamentInput', () => {
  it('applies MVP defaults', () => {
    const parsed = parseCreateTournamentInput({ name: 'Weekly Pokémon' });
    expect(parsed.startingBudget).toBe(10000);
    expect(parsed.durationDays).toBe(7);
    expect(parsed.tcgSlug).toBe('pokemon');
    expect(parsed.eligibleAssetTypes).toEqual(['sealed', 'graded', 'single']);
  });

  it('rejects empty names and non-positive budget or duration', () => {
    expect(() => parseCreateTournamentInput({ name: '   ' })).toThrow(/name is required/);
    expect(() => parseCreateTournamentInput({ name: 'Cup', startingBudget: 0 })).toThrow(
      /Starting budget/
    );
    expect(() => parseCreateTournamentInput({ name: 'Cup', durationDays: 0 })).toThrow(/Duration/);
  });

  it('rejects invalid start times', () => {
    expect(() => parseCreateTournamentInput({ name: 'Cup', startsAt: 'not-a-date' })).toThrow(
      /Invalid start time/
    );
  });
});
