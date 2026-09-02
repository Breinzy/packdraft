import { describe, expect, it } from 'vitest';
import {
  parseEventPayload,
  rankEventScores,
  scoreBiggestMover,
  scoreDirection,
  scoreEventEntry,
  scoreRanking,
  scoreReleasePrice,
} from './scoring';

const marks = [
  { assetId: 'a', startPrice: 100, endPrice: 120 },
  { assetId: 'b', startPrice: 50, endPrice: 40 },
  { assetId: 'c', startPrice: 10, endPrice: 30 },
];

describe('parseEventPayload', () => {
  it('rejects a ranking that is not a permutation', () => {
    expect(() =>
      parseEventPayload('ranking', { assetIds: ['a', 'a', 'b'] }, ['a', 'b', 'c'])
    ).toThrow(/permutation/);
  });

  it('accepts a direction pick', () => {
    expect(parseEventPayload('direction', { assetId: 'a', direction: 'up' }, ['a', 'b'])).toEqual({
      kind: 'direction',
      assetId: 'a',
      direction: 'up',
    });
  });
});

describe('event scoring', () => {
  it('scores a perfect release-price guess at 100 and a 10% miss at 90', () => {
    expect(scoreReleasePrice(50, 50)).toBe(100);
    expect(scoreReleasePrice(45, 50)).toBe(90);
    expect(scoreReleasePrice(0.01, 50)).toBe(0);
  });

  it('awards direction only when the asset actually moves that way', () => {
    expect(scoreDirection('up', 100, 120)).toBe(1);
    expect(scoreDirection('down', 100, 80)).toBe(1);
    expect(scoreDirection('up', 100, 80)).toBe(0);
    expect(scoreDirection('up', 100, 100)).toBe(0);
  });

  it('gives biggest-mover points to every tied max absolute move', () => {
    expect(scoreBiggestMover('c', marks)).toBe(1);
    expect(scoreBiggestMover('a', marks)).toBe(0);
    expect(
      scoreBiggestMover('x', [
        { assetId: 'x', startPrice: 10, endPrice: 20 },
        { assetId: 'y', startPrice: 10, endPrice: 0 },
      ])
    ).toBe(1);
  });

  it('maps a perfect ranking to 100 and a reversed ranking toward 0', () => {
    expect(scoreRanking(['c', 'a', 'b'], marks)).toBe(100);
    expect(scoreRanking(['b', 'a', 'c'], marks)).toBe(0);
  });

  it('ranks higher scores first and earlier submissions on ties', () => {
    const ranked = rankEventScores([
      { userId: 'u2', submittedAt: '2026-09-01T12:00:00.000Z', score: 1, detail: {} },
      { userId: 'u1', submittedAt: '2026-09-01T11:00:00.000Z', score: 1, detail: {} },
      { userId: 'u3', submittedAt: '2026-09-01T10:00:00.000Z', score: 0, detail: {} },
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(['u1', 'u2', 'u3']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('scores a stored payload against frozen marks', () => {
    const result = scoreEventEntry(
      { kind: 'direction', assetId: 'c', direction: 'up' },
      marks
    );
    expect(result.score).toBe(1);
  });
});
