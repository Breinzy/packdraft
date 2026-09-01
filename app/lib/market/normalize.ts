import { computeChangePct } from './stale';
import type {
  MarketProviderId,
  NormalizedAsset,
  NormalizedPrice,
  NormalizedSet,
} from './types';
import type { Card, SealedProduct, SetInfo } from '../pricing/client';

export function cardDisplayNumber(card: Card): string | undefined {
  return card.number ?? card.cardNumber;
}

export function cardImageUrl(card: Card): string | undefined {
  return card.imageUrl ?? card.imageCdnUrl;
}

export function sealedImageUrl(product: SealedProduct): string | undefined {
  return product.imageUrl ?? product.imageCdnUrl;
}

export function singlePriceAmount(card: Card): {
  price: number;
  priceType: NormalizedPrice['priceType'];
} | null {
  if (typeof card.prices?.market === 'number' && card.prices.market > 0) {
    return { price: card.prices.market, priceType: 'market' };
  }
  return null;
}

export function normalizeSet(set: SetInfo): NormalizedSet {
  return {
    tcgSlug: 'pokemon',
    name: set.name,
    slug: set.slug ?? set.tcgPlayerId,
    releaseDate: set.releaseDate,
    providerSetKey: set.tcgPlayerNumericId
      ? String(set.tcgPlayerNumericId)
      : set.tcgPlayerId ?? set.slug ?? set.id,
    cardCount: set.cardCount ?? set.totalCards,
    hasPriceGuide: set.hasPriceGuide,
  };
}

export function sealedPriceAmount(product: SealedProduct): {
  price: number;
  priceType: NormalizedPrice['priceType'];
} | null {
  if (typeof product.unopenedPrice === 'number' && product.unopenedPrice > 0) {
    return { price: product.unopenedPrice, priceType: 'unopened' };
  }
  if (typeof product.prices?.market === 'number' && product.prices.market > 0) {
    return { price: product.prices.market, priceType: 'market' };
  }
  return null;
}

export function gradedPriceAmount(
  card: Card,
  grade: 9 | 10
): { price: number; priceType: NormalizedPrice['priceType']; volume: number } | null {
  const psa = grade === 10
    ? card.ebay?.salesByGrade?.psa10 ?? card.ebay?.psa10
    : card.ebay?.salesByGrade?.psa9 ?? card.ebay?.psa9;

  if (!psa) return null;

  const volume = psa.count ?? psa.salesCount ?? 0;

  if (typeof psa.smartMarketPrice?.price === 'number' && psa.smartMarketPrice.price > 0) {
    return { price: psa.smartMarketPrice.price, priceType: 'ebay_smart', volume };
  }
  const average = psa.averagePrice ?? psa.avg;
  if (typeof average === 'number' && average > 0) {
    return { price: average, priceType: 'ebay_average', volume };
  }
  return null;
}

export function normalizeSealedProduct(
  product: SealedProduct,
  source: MarketProviderId,
  recordedAt: string
): { asset: NormalizedAsset; price: NormalizedPrice | null } | null {
  if (!product.tcgPlayerId) return null;

  const amount = sealedPriceAmount(product);
  const asset: NormalizedAsset = {
    tcgSlug: 'pokemon',
    setName: product.setName ?? 'Unknown',
    name: product.name,
    assetType: 'sealed',
    externalId: String(product.tcgPlayerId),
    imageUrl: sealedImageUrl(product),
    metadata: {
      setSlug: product.setSlug,
      sealedSubtype: classifySealedSubtype(product.name),
    },
  };

  const change7d = changeFromHistory(product.priceHistory);

  return {
    asset,
    price: amount
      ? {
          externalId: asset.externalId,
          assetType: 'sealed',
          price: amount.price,
          currency: 'USD',
          recordedAt,
          source,
          condition: 'unopened',
          priceType: amount.priceType,
          volume: 0,
          change7d,
          metadata: { grade: null },
        }
      : null,
  };
}

export function normalizeGradedCard(
  card: Card,
  grade: 9 | 10,
  source: MarketProviderId,
  recordedAt: string
): { asset: NormalizedAsset; price: NormalizedPrice | null } | null {
  if (!card.tcgPlayerId) return null;

  const amount = gradedPriceAmount(card, grade);
  const asset: NormalizedAsset = {
    tcgSlug: 'pokemon',
    setName: card.setName ?? 'Unknown',
    name: `${card.name}${cardDisplayNumber(card) ? ` ${cardDisplayNumber(card)}` : ''} PSA ${grade}`,
    assetType: 'graded',
    externalId: String(card.tcgPlayerId),
    imageUrl: cardImageUrl(card),
    metadata: {
      cardName: card.name,
      cardNumber: cardDisplayNumber(card),
      rarity: card.rarity,
      grade,
    },
  };

  return {
    asset,
    price: amount
      ? {
          externalId: asset.externalId,
          assetType: 'graded',
          price: amount.price,
          currency: 'USD',
          recordedAt,
          source,
          condition: `PSA ${grade}`,
          priceType: amount.priceType,
          volume: amount.volume,
          metadata: { grade },
        }
      : null,
  };
}

export function normalizeSingleCard(
  card: Card,
  source: MarketProviderId,
  recordedAt: string
): { asset: NormalizedAsset; price: NormalizedPrice | null } | null {
  if (!card.tcgPlayerId) return null;

  const amount = singlePriceAmount(card);
  const number = cardDisplayNumber(card);
  const asset: NormalizedAsset = {
    tcgSlug: 'pokemon',
    setName: card.setName ?? 'Unknown',
    name: `${card.name}${number ? ` ${number}` : ''}`,
    assetType: 'single',
    externalId: String(card.tcgPlayerId),
    imageUrl: cardImageUrl(card),
    metadata: {
      cardName: card.name,
      cardNumber: number,
      rarity: card.rarity,
      grade: null,
    },
  };

  const change7d = changeFromHistory(card.priceHistory);

  return {
    asset,
    price: amount
      ? {
          externalId: asset.externalId,
          assetType: 'single',
          price: amount.price,
          currency: 'USD',
          recordedAt,
          source,
          condition: 'ungraded',
          priceType: amount.priceType,
          volume: 0,
          change7d,
          metadata: { grade: null },
        }
      : null,
  };
}

export function classifySealedSubtype(
  name: string
): 'booster_box' | 'etb' | 'premium_collection' | 'booster_bundle' | 'upc' {
  const lower = name.toLowerCase();
  if (lower.includes('ultra premium') || lower.includes('upc')) return 'upc';
  if (lower.includes('elite trainer box') || lower.includes('etb')) return 'etb';
  if (lower.includes('booster bundle') || lower.includes('bundle')) return 'booster_bundle';
  if (lower.includes('premium collection') || lower.includes('special collection')) {
    return 'premium_collection';
  }
  return 'booster_box';
}

function changeFromHistory(
  history: { date: string; price: number }[] | undefined
): number {
  if (!history || history.length < 2) return 0;
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return computeChangePct(sorted[0].price, sorted[sorted.length - 1].price);
}
