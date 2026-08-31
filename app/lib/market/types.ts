export const MARKET_PROVIDER_IDS = ['pokemonpricetracker'] as const;
export type MarketProviderId = (typeof MARKET_PROVIDER_IDS)[number];

export type NormalizedAssetType = 'sealed' | 'single' | 'graded';

export interface NormalizedSet {
  tcgSlug: string;
  name: string;
  slug?: string;
  releaseDate?: string;
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
}

export interface AssetPriceRef {
  externalId: string;
  assetType: NormalizedAssetType;
}

export interface MarketDataProvider {
  readonly id: MarketProviderId;
  fetchSets(): Promise<NormalizedSet[]>;
  fetchSealedPage(query: {
    search: string;
    limit?: number;
    offset?: number;
  }): Promise<{ assets: NormalizedAsset[]; prices: NormalizedPrice[]; total: number }>;
  fetchGradedPage(query: {
    limit?: number;
    offset?: number;
  }): Promise<{ assets: NormalizedAsset[]; prices: NormalizedPrice[]; total: number }>;
  fetchPrices(refs: AssetPriceRef[]): Promise<NormalizedPrice[]>;
}
