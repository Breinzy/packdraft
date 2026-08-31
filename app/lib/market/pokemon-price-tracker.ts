import {
  getGradedCardPrices,
  getSealedProductPrices,
  getSealedProductsBySearch,
  getSets,
  getTopCards,
} from '@/lib/pricing/client';
import {
  normalizeGradedCard,
  normalizeSealedProduct,
  normalizeSet,
} from './normalize';
import type {
  AssetPriceRef,
  MarketDataProvider,
  MarketProviderId,
  NormalizedAsset,
  NormalizedPrice,
  NormalizedSet,
} from './types';

const SOURCE: MarketProviderId = 'pokemonpricetracker';

export class PokemonPriceTrackerProvider implements MarketDataProvider {
  readonly id = SOURCE;

  async fetchSets(): Promise<NormalizedSet[]> {
    const sets = await getSets();
    return sets.map(normalizeSet);
  }

  async fetchSealedPage(query: {
    search: string;
    limit?: number;
    offset?: number;
  }): Promise<{ assets: NormalizedAsset[]; prices: NormalizedPrice[]; total: number }> {
    const recordedAt = new Date().toISOString();
    const { products, total } = await getSealedProductsBySearch(query);
    const assets: NormalizedAsset[] = [];
    const prices: NormalizedPrice[] = [];

    for (const product of products) {
      const normalized = normalizeSealedProduct(product, SOURCE, recordedAt);
      if (!normalized) continue;
      assets.push(normalized.asset);
      if (normalized.price) prices.push(normalized.price);
    }

    return { assets, prices, total };
  }

  async fetchGradedPage(query: {
    limit?: number;
    offset?: number;
  }): Promise<{ assets: NormalizedAsset[]; prices: NormalizedPrice[]; total: number }> {
    const recordedAt = new Date().toISOString();
    const { cards, total } = await getTopCards({
      sortBy: 'volume',
      sortOrder: 'desc',
      limit: query.limit ?? 25,
      offset: query.offset,
      includeEbay: true,
      minPrice: 5,
    });

    const assets: NormalizedAsset[] = [];
    const prices: NormalizedPrice[] = [];

    for (const card of cards) {
      for (const grade of [10, 9] as const) {
        const normalized = normalizeGradedCard(card, grade, SOURCE, recordedAt);
        if (!normalized) continue;
        assets.push(normalized.asset);
        if (normalized.price) prices.push(normalized.price);
      }
    }

    return { assets, prices, total };
  }

  async fetchPrices(refs: AssetPriceRef[]): Promise<NormalizedPrice[]> {
    const recordedAt = new Date().toISOString();
    const sealedIds = refs
      .filter((ref) => ref.assetType === 'sealed')
      .map((ref) => Number(ref.externalId))
      .filter((id) => Number.isFinite(id));
    const gradedIds = refs
      .filter((ref) => ref.assetType === 'graded')
      .map((ref) => Number(ref.externalId))
      .filter((id) => Number.isFinite(id));

    const prices: NormalizedPrice[] = [];

    if (sealedIds.length > 0) {
      const sealed = await getSealedProductPrices(sealedIds);
      for (const product of sealed) {
        const normalized = normalizeSealedProduct(product, SOURCE, recordedAt);
        if (normalized?.price) prices.push(normalized.price);
      }
    }

    if (gradedIds.length > 0) {
      const cards = await getGradedCardPrices(gradedIds, { includeEbay: true });
      for (const card of cards) {
        for (const grade of [10, 9] as const) {
          const requested = refs.some(
            (ref) =>
              ref.assetType === 'graded' &&
              ref.externalId === String(card.tcgPlayerId)
          );
          if (!requested) continue;
          const normalized = normalizeGradedCard(card, grade, SOURCE, recordedAt);
          if (normalized?.price) prices.push(normalized.price);
        }
      }
    }

    return prices;
  }
}
