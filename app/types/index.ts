export type AssetType = 'sealed' | 'single' | 'graded';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  display_name_set: boolean;
  created_at: string;
  creator_slug: string | null;
  creator_bio: string;
  is_creator: boolean;
  pro_until: string | null;
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
  snapshotId?: string;
}

export type TournamentStatus =
  | 'upcoming'
  | 'active'
  | 'locked'
  | 'settling'
  | 'completed'
  | 'archived';

export type TradeSide = 'buy' | 'sell';

export type TournamentVisibility = 'public' | 'private';
export type TournamentHostKind = 'admin' | 'creator';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  tcg_id: string;
  starting_budget: number;
  starts_at: string;
  trading_closes_at: string;
  ends_at: string;
  status: TournamentStatus;
  rules: Record<string, unknown>;
  prize_info: Record<string, unknown>;
  eligible_asset_types: AssetType[];
  created_by: string | null;
  created_at: string;
  settled_at: string | null;
  visibility: TournamentVisibility;
  invite_code: string | null;
  host_kind: TournamentHostKind;
  sponsor_name: string;
  sponsor_url: string;
  entry_mode: 'free';
  qualifier_tournament_id: string | null;
  qualifier_max_rank: number;
}

export interface TournamentPortfolio {
  id: string;
  tournament_id: string;
  user_id: string;
  starting_cash: number;
  cash: number;
  created_at: string;
}

export interface TournamentPosition {
  id: string;
  portfolio_id: string;
  asset_id: string;
  quantity: number;
  average_cost: number;
}

export interface TournamentTransaction {
  id: string;
  portfolio_id: string;
  asset_id: string;
  side: TradeSide;
  quantity: number;
  execution_price: number;
  total_value: number;
  executed_at: string;
  price_snapshot_id: string | null;
}

export interface TournamentResult {
  tournament_id: string;
  user_id: string;
  portfolio_id: string;
  cash: number;
  holdings_value: number;
  final_value: number;
  return_pct: number;
  rank: number;
  locked_at: string;
}

export interface TournamentStanding {
  user_id: string;
  display_name: string;
  cash: number;
  holdings_value: number;
  portfolio_value: number;
  return_pct: number;
  rank: number;
  frozen: boolean;
  joined_at: string;
}

export interface CatalogAsset {
  id: string;
  name: string;
  asset_type: AssetType;
  image_url: string | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  tcg_id: string;
  tcg_name: string | null;
  tcg_slug: string | null;
  set_id: string | null;
  set_name: string | null;
  price: number | null;
  recorded_at: string | null;
  change_7d: number | null;
  volume: number | null;
  source: string | null;
  price_type: string | null;
  condition: string | null;
  stale: boolean;
}

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  locked: 'Locked',
  settling: 'Settling',
  completed: 'Completed',
  archived: 'Archived',
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  sealed: 'Sealed',
  single: 'Single',
  graded: 'Graded',
};

export type MarketEventType = 'release_price' | 'direction' | 'ranking' | 'biggest_mover';

export type MarketEventStatus =
  | 'upcoming'
  | 'open'
  | 'locked'
  | 'settling'
  | 'completed'
  | 'cancelled';

export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  type: MarketEventType;
  status: MarketEventStatus;
  opens_at: string;
  locks_at: string;
  settles_at: string;
  created_by: string | null;
  created_at: string;
  settled_at: string | null;
}

export interface MarketEventAsset {
  event_id: string;
  asset_id: string;
  sort_order: number;
  start_price: number | null;
  end_price: number | null;
  start_method: string | null;
  end_method: string | null;
  asset: Asset | null;
}

export interface MarketEventStanding {
  user_id: string;
  display_name: string;
  score: number;
  rank: number;
  frozen: boolean;
}

export const MARKET_EVENT_TYPE_LABELS: Record<MarketEventType, string> = {
  release_price: 'Release price',
  direction: 'Direction',
  ranking: 'Ranking',
  biggest_mover: 'Biggest mover',
};

export const MARKET_EVENT_STATUS_LABELS: Record<MarketEventStatus, string> = {
  upcoming: 'Upcoming',
  open: 'Open',
  locked: 'Locked',
  settling: 'Settling',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface PlayerRanking {
  user_id: string;
  display_name: string;
  played: number;
  wins: number;
  average_return: number;
  rank: number;
}

export interface ReleaseCampaign {
  id: string;
  name: string;
  description: string;
  set_id: string | null;
  starts_at: string;
  ends_at: string;
  created_by: string | null;
  created_at: string;
}

export const CAREER_STARTING_CASH = 1000;

export interface CareerStanding {
  user_id: string;
  display_name: string;
  portfolio_value: number;
  return_pct: number;
  rank: number;
}

export interface CareerPortfolio {
  id: string;
  user_id: string;
  starting_cash: number;
  cash: number;
  created_at: string;
}

export interface CareerPosition {
  id: string;
  portfolio_id: string;
  asset_id: string;
  quantity: number;
  average_cost: number;
}

export interface CareerTransaction {
  id: string;
  portfolio_id: string;
  asset_id: string;
  side: TradeSide;
  quantity: number;
  execution_price: number;
  total_value: number;
  executed_at: string;
  price_snapshot_id: string | null;
}

export interface CareerValueSnapshot {
  id: string;
  portfolio_id: string;
  cash: number;
  holdings_value: number;
  portfolio_value: number;
  recorded_at: string;
};
