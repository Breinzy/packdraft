import { describe, expect, it } from 'vitest';
import {
  classifySealedSubtype,
  gradedPriceAmount,
  normalizeGradedCard,
  normalizeSealedProduct,
  sealedPriceAmount,
} from './normalize';
import type { Card, SealedProduct } from '../pricing/client';

describe('sealedPriceAmount', () => {
  it('prefers unopenedPrice over market', () => {
    const result = sealedPriceAmount({
      tcgPlayerId: 1,
      name: 'Box',
      unopenedPrice: 120,
      prices: { market: 99 },
    });
    expect(result).toEqual({ price: 120, priceType: 'unopened' });
  });

  it('falls back to TCGPlayer market', () => {
    const result = sealedPriceAmount({
      tcgPlayerId: 1,
      name: 'Box',
      prices: { market: 88 },
    });
    expect(result).toEqual({ price: 88, priceType: 'market' });
  });

  it('returns null when no positive price exists', () => {
    expect(sealedPriceAmount({ tcgPlayerId: 1, name: 'Box' })).toBeNull();
  });
});

describe('gradedPriceAmount', () => {
  it('prefers eBay smart market price', () => {
    const card: Card = {
      tcgPlayerId: 9,
      name: 'Pikachu',
      ebay: {
        salesByGrade: {
          psa10: { smartMarketPrice: { price: 250, confidence: 'high' }, averagePrice: 200, count: 12 },
        },
      },
    };
    expect(gradedPriceAmount(card, 10)).toEqual({
      price: 250,
      priceType: 'ebay_smart',
      volume: 12,
    });
  });
});

describe('normalizeSealedProduct', () => {
  it('builds a Packdraft asset and snapshot', () => {
    const product: SealedProduct = {
      tcgPlayerId: 42,
      name: 'Prismatic Evolutions Elite Trainer Box',
      setName: 'Prismatic Evolutions',
      unopenedPrice: 55,
    };
    const result = normalizeSealedProduct(product, 'pokemonpricetracker', '2026-08-31T00:00:00.000Z');
    expect(result).toBeTruthy();
    expect(result?.asset.assetType).toBe('sealed');
    expect(result?.asset.externalId).toBe('42');
    expect(result?.price?.price).toBe(55);
    expect(result?.price?.condition).toBe('unopened');
    expect(result?.asset.metadata.sealedSubtype).toBe('etb');
  });
});

describe('normalizeGradedCard', () => {
  it('names the asset with PSA grade', () => {
    const card: Card = {
      tcgPlayerId: 7,
      name: 'Charizard',
      number: '4',
      setName: 'Base',
      ebay: { psa10: { avg: 400, count: 3 } },
    };
    const result = normalizeGradedCard(card, 10, 'pokemonpricetracker', '2026-08-31T00:00:00.000Z');
    expect(result).toBeTruthy();
    expect(result?.asset.name).toBe('Charizard 4 PSA 10');
    expect(result?.price?.price).toBe(400);
    expect(result?.price?.priceType).toBe('ebay_average');
  });
});

describe('classifySealedSubtype', () => {
  it('classifies common sealed names', () => {
    expect(classifySealedSubtype('Surging Sparks Booster Box')).toBe('booster_box');
    expect(classifySealedSubtype('Elite Trainer Box')).toBe('etb');
    expect(classifySealedSubtype('Ultra Premium Collection')).toBe('upc');
  });
});
