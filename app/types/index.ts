export type AssetType = 'sealed' | 'single' | 'graded';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  display_name_set: boolean;
  created_at: string;
}

export interface Tcg {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface TcgSet {
  id: string;
  tcg_id: string;
  name: string;
  slug: string | null;
  release_date: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  tcg_id: string;
  set_id: string | null;
  name: string;
  asset_type: AssetType;
  external_id: string | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export type PriceType = 'market' | 'unopened' | 'ebay_smart' | 'ebay_average';

export interface PriceSnapshot {
  id: string;
  asset_id: string | null;
  product_id: string | null;
  price: number;
  change_7d: number;
  volume: number;
  recorded_at: string;
  source: string;
  condition: string | null;
  price_type: PriceType | string;
  metadata: Record<string, unknown>;
}

export interface CurrentPrice {
  assetId: string;
  price: number;
  recordedAt: string;
  source: string;
  priceType: string;
  condition: string | null;
  change7d: number;
  volume: number;
  stale: boolean;
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  sealed: 'Sealed',
  single: 'Single',
  graded: 'Graded',
};
