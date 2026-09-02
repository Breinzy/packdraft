export const MARKET_PROVIDER_IDS = ['pokemonpricetracker'] as const;
export type MarketProviderId = (typeof MARKET_PROVIDER_IDS)[number];

export type NormalizedAssetType = 'sealed' | 'single' | 'graded';

export interface NormalizedSet {
  tcgSlug: string;
  name: string;
  slug?: string;
  releaseDate?: string;
  providerSetKey?: string;
  cardCount?: number;
  hasPriceGuide?: boolean;
}

export interface NormalizedAsset {
  tcgSlug: string;
  setName: string;
  name: string;
  assetType: NormalizedAssetType;
  externalId: string;
  imageUrl?: string;
  metadata: Record<string, unknown>;
}

export interface NormalizedPrice {
  externalId: string;
  assetType: NormalizedAssetType;
  price: number;
  currency: 'USD';
  recordedAt: string;
  source: MarketProviderId;
  condition?: string;
  priceType: 'market' | 'unopened' | 'ebay_smart' | 'ebay_average';
  volume?: number;
  change7d?: number;
  metadata?: Record<string, unknown>;
  history?: { date: string; price: number; volume: number }[];
}

export interface AssetPriceRef {
  externalId: string;
  assetType: NormalizedAssetType;
}

export interface ProviderPage {
  assets: NormalizedAsset[];
  prices: NormalizedPrice[];
  total: number;
  creditsConsumed: number;
  dailyRemaining: number | null;
}

export interface MarketDataProvider {
  readonly id: MarketProviderId;
  fetchSets(): Promise<NormalizedSet[]>;
  fetchSealedPage(query: {
    search?: string;
    minPrice?: number;
    limit?: number;
    offset?: number;
    fetchAllInSet?: boolean;
    set?: string;
  }): Promise<ProviderPage>;
  fetchGradedPage(query: {
    limit?: number;
    offset?: number;
  }): Promise<ProviderPage>;
  fetchCardsPage(query: {
    limit?: number;
    offset?: number;
    includeEbay?: boolean;
    set?: string;
    setId?: string;
    fetchAllInSet?: boolean;
  }): Promise<ProviderPage>;
  fetchPrices(
    refs: AssetPriceRef[],
    options?: { includeHistory?: boolean; days?: number }
  ): Promise<NormalizedPrice[]>;
}
