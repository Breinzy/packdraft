import { describe, expect, it } from 'vitest';
import { creatorBudgetCap, creatorDurationCap, parseCreatorSlug } from './rules';

describe('creator rules', () => {
  it('normalizes slugs', () => {
    expect(parseCreatorSlug('Poke-Streamer_1')).toBe('poke-streamer1');
  });

  it('caps creator budget and duration; admins are uncapped here', () => {
    expect(() => creatorBudgetCap(false, 250000)).toThrow(/100,000/);
    expect(creatorBudgetCap(true, 250000)).toBe(250000);
    expect(() => creatorDurationCap(false, 90)).toThrow(/1–30/);
    expect(creatorDurationCap(true, 90)).toBe(90);
  });
});
