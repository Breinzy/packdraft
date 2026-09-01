import { describe, expect, it } from 'vitest';
import { csvNumber, parseCsv } from './csv';
import { sealedProductFromCsv } from './catalog-import';

describe('parseCsv', () => {
  it('parses a header row and quoted commas', () => {
    const rows = parseCsv(
      'tcgPlayerId,name,marketPrice\n1,"Charizard, Base",12.50\n2,Pikachu,1.00\n'
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ tcgPlayerId: '1', name: 'Charizard, Base', marketPrice: '12.50' });
    expect(rows[1].name).toBe('Pikachu');
  });

  it('handles escaped quotes', () => {
    const rows = parseCsv('name\n"He said ""hi"""\n');
    expect(rows[0].name).toBe('He said "hi"');
  });
});

describe('csvNumber', () => {
  it('returns null for blanks and non-numeric text', () => {
    expect(csvNumber('')).toBeNull();
    expect(csvNumber('  ')).toBeNull();
    expect(csvNumber('nope')).toBeNull();
    expect(csvNumber('4.25')).toBe(4.25);
  });
});

describe('sealedProductFromCsv', () => {
  it('maps PPT sealed export columns', () => {
    const product = sealedProductFromCsv({
      tcgPlayerId: '624679',
      name: 'Surging Sparks Booster Box',
      setName: 'Surging Sparks',
      marketPrice: '144.99',
      lowPrice: '130',
      language: 'english',
    });
    expect(product?.tcgPlayerId).toBe(624679);
    expect(product?.unopenedPrice).toBe(144.99);
    expect(product?.prices?.market).toBe(144.99);
  });

  it('skips rows without an id or name', () => {
    expect(sealedProductFromCsv({ tcgPlayerId: '', name: 'Box', marketPrice: '1' })).toBeNull();
    expect(sealedProductFromCsv({ tcgPlayerId: '1', name: '', marketPrice: '1' })).toBeNull();
  });
});
