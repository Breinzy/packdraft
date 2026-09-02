import type { MarketEventType } from '@/types';

export interface CreateMarketEventInput {
  name: string;
  description?: string;
  type: MarketEventType | string;
  opensAt?: string;
  locksAt?: string;
  settlesAt?: string;
  lockHours?: number;
  settleHoursAfterLock?: number;
  assetIds?: string[];
  assetCount?: number;
}

const TYPES: MarketEventType[] = ['release_price', 'direction', 'ranking', 'biggest_mover'];

export function parseCreateMarketEventInput(input: CreateMarketEventInput): {
  name: string;
  description: string;
  type: MarketEventType;
  opensAt: Date;
  locksAt: Date;
  settlesAt: Date;
  assetIds: string[];
  assetCount: number;
} {
  const name = input.name.trim();
  if (!name) throw new Error('Event name is required');

  if (!TYPES.includes(input.type as MarketEventType)) {
    throw new Error('Unknown market event type');
  }
  const type = input.type as MarketEventType;

  const opensAt = input.opensAt ? new Date(input.opensAt) : new Date();
  if (Number.isNaN(opensAt.getTime())) throw new Error('Invalid open time');

  let locksAt: Date;
  if (input.locksAt) {
    locksAt = new Date(input.locksAt);
  } else {
    const hours = input.lockHours ?? 24;
    if (!(hours > 0)) throw new Error('Lock window must be positive');
    locksAt = new Date(opensAt.getTime() + hours * 60 * 60 * 1000);
  }
  if (Number.isNaN(locksAt.getTime())) throw new Error('Invalid lock time');

  let settlesAt: Date;
  if (input.settlesAt) {
    settlesAt = new Date(input.settlesAt);
  } else {
    const hours = input.settleHoursAfterLock ?? 24;
    if (!(hours > 0)) throw new Error('Settle window must be positive');
    settlesAt = new Date(locksAt.getTime() + hours * 60 * 60 * 1000);
  }
  if (Number.isNaN(settlesAt.getTime())) throw new Error('Invalid settle time');

  if (!(locksAt.getTime() > opensAt.getTime())) {
    throw new Error('Lock time must be after open time');
  }
  if (!(settlesAt.getTime() > locksAt.getTime())) {
    throw new Error('Settle time must be after lock time');
  }

  const assetIds = (input.assetIds ?? []).map((id) => id.trim()).filter(Boolean);
  const unique = [...new Set(assetIds)];
  const assetCount = unique.length > 0 ? unique.length : Math.max(1, Math.min(input.assetCount ?? defaultAssetCount(type), 12));

  if (type === 'ranking' && unique.length > 0 && unique.length < 3) {
    throw new Error('Ranking events need at least 3 assets');
  }
  if (type === 'ranking' && unique.length === 0 && assetCount < 3) {
    throw new Error('Ranking events need at least 3 assets');
  }

  return {
    name,
    description: input.description?.trim() ?? '',
    type,
    opensAt,
    locksAt,
    settlesAt,
    assetIds: unique,
    assetCount,
  };
}

function defaultAssetCount(type: MarketEventType): number {
  if (type === 'release_price') return 1;
  if (type === 'ranking') return 5;
  return 4;
}
