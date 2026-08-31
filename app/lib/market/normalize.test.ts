import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifySealedSubtype,
  gradedPriceAmount,
  normalizeGradedCard,
  normalizeSealedProduct,
  sealedPriceAmount,
} from './normalize.ts';
import type { Card, SealedProduct } from '../pricing/client.ts';

describe('sealedPriceAmount', () => {
  it('prefers unopenedPrice over market', () => {
    const result = sealedPriceAmount({
      tcgPlayerId: 1,
      name: 'Box',
      unopenedPrice: 120,
      prices: { market: 99 },
    });
    assert.deepEqual(result, { price: 120, priceType: 'unopened' });
  });

  it('falls back to TCGPlayer market', () => {
    const result = sealedPriceAmount({
      tcgPlayerId: 1,
      name: 'Box',
      prices: { market: 88 },
    });
    assert.deepEqual(result, { price: 88, priceType: 'market' });
  });

  it('returns null when no positive price exists', () => {
    assert.equal(sealedPriceAmount({ tcgPlayerId: 1, name: 'Box' }), null);
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
    assert.deepEqual(gradedPriceAmount(card, 10), {
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
    assert.ok(result);
    assert.equal(result.asset.assetType, 'sealed');
    assert.equal(result.asset.externalId, '42');
    assert.equal(result.price?.price, 55);
    assert.equal(result.price?.condition, 'unopened');
    assert.equal(result.asset.metadata.sealedSubtype, 'etb');
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
    assert.ok(result);
    assert.equal(result.asset.name, 'Charizard 4 PSA 10');
    assert.equal(result.price?.price, 400);
    assert.equal(result.price?.priceType, 'ebay_average');
  });
});

describe('classifySealedSubtype', () => {
  it('classifies common sealed names', () => {
    assert.equal(classifySealedSubtype('Surging Sparks Booster Box'), 'booster_box');
    assert.equal(classifySealedSubtype('Elite Trainer Box'), 'etb');
    assert.equal(classifySealedSubtype('Ultra Premium Collection'), 'upc');
  });
});
