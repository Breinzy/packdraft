import {
  getAllSets,
  getCardsPage,
  getGradedCardPrices,
  getSealedProductPrices,
  getSealedProductsPage,
  getSets,
  getTopCards,
  type ProviderResponseMeta,
} from '@/lib/pricing/client';
import {
  normalizeGradedCard,
  normalizeSealedProduct,
  normalizeSet,
  normalizeSingleCard,
} from './normalize';
import { extractHistoryPoints, HISTORY_DAYS } from './history';
import type {
  AssetPriceRef,
  MarketDataProvider,
  MarketProviderId,
  NormalizedAsset,
  NormalizedPrice,
  NormalizedSet,
  ProviderPage,
} from './types';

const SOURCE: MarketProviderId = 'pokemonpricetracker';

function withHistory(
  price: NormalizedPrice,
  payload: unknown,
  includeHistory: boolean
): NormalizedPrice {
  if (!includeHistory) return price;
  const history = extractHistoryPoints(payload);
  const latest = history[history.length - 1];
  return {
    ...price,
    history,
    volume: latest?.volume ?? price.volume ?? 0,
  };
}

function pageFrom(
  assets: NormalizedAsset[],
  prices: NormalizedPrice[],
  total: number,
  meta: ProviderResponseMeta
): ProviderPage {
  return {
    assets,
    prices,
    total,
    creditsConsumed: meta.creditsConsumed,
    dailyRemaining: meta.dailyRemaining,
  };
}

export class PokemonPriceTrackerProvider implements MarketDataProvider {
  readonly id = SOURCE;

  async fetchSets(): Promise<NormalizedSet[]> {
    const { sets } = await getAllSets().catch(async () => ({ sets: await getSets() }));
    return sets.map(normalizeSet);
  }

  async fetchSealedPage(query: {
    search?: string;
    minPrice?: number;
    limit?: number;
    offset?: number;
    fetchAllInSet?: boolean;
    set?: string;
  }): Promise<ProviderPage> {
    const recordedAt = new Date().toISOString();
    const { products, total, meta } = await getSealedProductsPage({
      search: query.search,
      minPrice: query.minPrice,
      set: query.set,
      fetchAllInSet: query.fetchAllInSet,
      limit: query.limit,
      offset: query.offset,
    });
    const assets: NormalizedAsset[] = [];
    const prices: NormalizedPrice[] = [];

    for (const product of products) {
      const normalized = normalizeSealedProduct(product, SOURCE, recordedAt);
      if (!normalized) continue;
      assets.push(normalized.asset);
      if (normalized.price) prices.push(normalized.price);
    }

    return pageFrom(assets, prices, total, meta);
  }

  async fetchGradedPage(query: {
    limit?: number;
    offset?: number;
  }): Promise<ProviderPage> {
    const recordedAt = new Date().toISOString();
    const { cards, total, meta } = await getTopCards({
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

    return pageFrom(assets, prices, total, meta);
  }

  async fetchCardsPage(query: {
    limit?: number;
    offset?: number;
    includeEbay?: boolean;
    set?: string;
    setId?: string;
    fetchAllInSet?: boolean;
  }): Promise<ProviderPage> {
    const recordedAt = new Date().toISOString();
    const { cards, total, meta } = await getCardsPage({
      limit: query.limit,
      offset: query.offset,
      includeEbay: query.includeEbay,
      set: query.set,
      setId: query.setId,
      fetchAllInSet: query.fetchAllInSet,
      sortBy: query.includeEbay ? 'price' : 'cardNumber',
      sortOrder: query.includeEbay ? 'desc' : 'asc',
    });

    const assets: NormalizedAsset[] = [];
    const prices: NormalizedPrice[] = [];

    for (const card of cards) {
      const single = normalizeSingleCard(card, SOURCE, recordedAt);
      if (single) {
        assets.push(single.asset);
        if (single.price) prices.push(single.price);
      }
      if (query.includeEbay) {
        for (const grade of [10, 9] as const) {
          const graded = normalizeGradedCard(card, grade, SOURCE, recordedAt);
          if (!graded) continue;
          assets.push(graded.asset);
          if (graded.price) prices.push(graded.price);
        }
      }
    }

    return pageFrom(assets, prices, total, meta);
  }

  async fetchPrices(
    refs: AssetPriceRef[],
    options: { includeHistory?: boolean; days?: number } = {}
  ): Promise<NormalizedPrice[]> {
    const recordedAt = new Date().toISOString();
    const includeHistory = options.includeHistory === true;
    const days = options.days ?? HISTORY_DAYS;
    const sealedIds = [
      ...new Set(
        refs
          .filter((ref) => ref.assetType === 'sealed')
          .map((ref) => Number(ref.externalId))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    const cardIds = [
      ...new Set(
        refs
          .filter((ref) => ref.assetType === 'graded' || ref.assetType === 'single')
          .map((ref) => Number(ref.externalId))
          .filter((id) => Number.isFinite(id))
      ),
    ];
    const needsEbay = refs.some((ref) => ref.assetType === 'graded');

    const prices: NormalizedPrice[] = [];

    if (sealedIds.length > 0) {
      const sealed = await getSealedProductPrices(sealedIds, {
        includeHistory,
        days: includeHistory ? days : undefined,
      });
      for (const product of sealed) {
        const normalized = normalizeSealedProduct(product, SOURCE, recordedAt);
        if (normalized?.price) prices.push(withHistory(normalized.price, product, includeHistory));
      }
    }

    if (cardIds.length > 0) {
      const cards = await getGradedCardPrices(cardIds, {
        includeEbay: needsEbay,
        includeHistory,
        days: includeHistory ? days : undefined,
      });
      for (const card of cards) {
        const wantsSingle = refs.some(
          (ref) => ref.assetType === 'single' && ref.externalId === String(card.tcgPlayerId)
        );
        if (wantsSingle) {
          const single = normalizeSingleCard(card, SOURCE, recordedAt);
          if (single?.price) prices.push(withHistory(single.price, card, includeHistory));
        }
        if (needsEbay) {
          for (const grade of [10, 9] as const) {
            const requested = refs.some(
              (ref) =>
                ref.assetType === 'graded' && ref.externalId === String(card.tcgPlayerId)
            );
            if (!requested) continue;
            const normalized = normalizeGradedCard(card, grade, SOURCE, recordedAt);
            if (normalized?.price) prices.push(withHistory(normalized.price, card, includeHistory));
          }
        }
      }
    }

    return prices;
  }
}
