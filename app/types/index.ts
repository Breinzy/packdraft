export type ContestStatus = 'pending' | 'active' | 'complete';
export type ProductType = 'booster_box' | 'etb' | 'premium_collection' | 'booster_bundle' | 'upc';

export interface Contest {
  id: string;
  starts_at: string;
  ends_at: string;
  status: ContestStatus;
  created_at: string;
}

export interface League {
  id: string;
  name: string;
  contest_id: string;
  player_count: number;
  is_full: boolean;
  all_locked_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  current_league_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  set_name: string;
  type: ProductType;
  tcgplayer_id: string | null;
  image_code: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PriceSnapshot {
  id: string;
  product_id: string;
  price: number;
  change_7d: number;
  volume: number;
  recorded_at: string;
  source: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  contest_id: string;
  league_id: string;
  submitted_at: string | null;
  is_locked: boolean;
  cash_remaining: number;
  final_value: number | null;
  final_rank_league: number | null;
  final_rank_global: number | null;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  portfolio_id: string;
  product_id: string;
  quantity: number;
  price_at_lock: number | null;
}

export interface ProductWithPrice extends Product {
  price: number;
  change_7d: number;
  volume: number;
}

export interface PortfolioItemWithProduct extends PortfolioItem {
  product: ProductWithPrice;
}

export interface LeaderboardEntry {
  rank: number;
  profile: Profile;
  portfolio: Portfolio;
  total_value: number;
  return_pct: number;
}

export const BUDGET = 5000;
export const MAX_SLOTS = 20;
export const MAX_PER_PRODUCT = 10;
export const CASH_DECAY_RATE = 0.01;
export const LEAGUE_SIZE = 20;

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  booster_box: 'Booster Box',
  etb: 'ETB',
  premium_collection: 'Premium Collection',
  booster_bundle: 'Booster Bundle',
  upc: 'UPC',
};

export const SET_COLORS: Record<string, string> = {
  'Prismatic Evolutions': '#a78bfa',
  'Surging Sparks': '#fbbf24',
  'Stellar Crown': '#60a5fa',
  'Twilight Masquerade': '#f472b6',
  'Paradox Rift': '#34d399',
  'Eevee Heroes': '#fb923c',
  'Scarlet & Violet': '#f87171',
};

export const TYPE_ICONS: Record<string, string> = {
  booster_box: '📦',
  etb: '🎁',
  premium_collection: '⭐',
  booster_bundle: '🗂️',
  upc: '🔒',
};
