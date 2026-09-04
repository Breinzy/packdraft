import { describe, expect, it } from 'vitest';
import { chunkIds } from './prices';

describe('chunkIds', () => {
  it('deduplicates and chunks asset ids for PostgREST .in() filters', () => {
    expect(chunkIds(['a', 'a', 'b', 'c'], 2)).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
    expect(chunkIds([])).toEqual([]);
  });
});
