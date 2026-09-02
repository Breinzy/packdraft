import { describe, expect, it } from 'vitest';
import { tcgplayerProductUrl } from './affiliate';

describe('tcgplayerProductUrl', () => {
  it('returns null without a numeric TCGPlayer id', () => {
    expect(tcgplayerProductUrl(null, 'abc')).toBeNull();
    expect(tcgplayerProductUrl('not-a-number', 'abc')).toBeNull();
  });

  it('adds a partner code only when configured', () => {
    expect(tcgplayerProductUrl('12345', undefined)).toBe(
      'https://www.tcgplayer.com/product/12345'
    );
    expect(tcgplayerProductUrl('12345', 'packdraft')).toContain('partner=packdraft');
  });
});
