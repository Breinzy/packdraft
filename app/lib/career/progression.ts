import { CAREER_STARTING_CASH, type AssetType } from '@/types';
import { returnPct, roundMoney } from '@/lib/money';
import {
  replayRealizedTrades,
  type Achievement,
  type HistoryTrade,
} from '@/lib/player/history';

export const CAREER_MILESTONES = [2000, 5000, 10000, 25000, 100000, 1_000_000] as const;

export const CAREER_LEVELS: { level: number; name: string; at: number }[] = [
  { level: 1, name: 'Rookie', at: CAREER_STARTING_CASH },
  { level: 2, name: 'Collector', at: 2000 },
  { level: 3, name: 'Investor', at: 5000 },
  { level: 4, name: 'Operator', at: 10000 },
  { level: 5, name: 'Whale', at: 25000 },
  { level: 6, name: 'Tycoon', at: 100000 },
  { level: 7, name: 'Legend', at: 1_000_000 },
];

export interface CareerHoldingMix {
  assetType: AssetType | null;
  quantity: number;
  markPrice: number | null;
}

export interface CareerLevel {
  level: number;
  name: string;
  nextAt: number | null;
  nextName: string | null;
}

export interface CareerArchetype {
  id: string;
  label: string;
  reason: string;
}

export interface CareerMilestone {
  value: number;
  label: string;
  earned: boolean;
}

export interface CareerStats {
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  distinctAssets: number;
  realizedPnl: number;
  peakValue: number;
  currentValue: number;
  returnPct: number;
  streakDays: number;
}

export interface CareerProgression {
  level: CareerLevel;
  archetype: CareerArchetype;
  milestones: CareerMilestone[];
  stats: CareerStats;
  achievements: Achievement[];
  challenges: Achievement[];
}

export function careerLevelFromPeak(peakValue: number): CareerLevel {
  let current = CAREER_LEVELS[0]!;
  for (const row of CAREER_LEVELS) {
    if (peakValue + 1e-9 >= row.at) current = row;
  }
  const next = CAREER_LEVELS.find((row) => row.level === current.level + 1) ?? null;
  return {
    level: current.level,
    name: current.name,
    nextAt: next?.at ?? null,
    nextName: next?.name ?? null,
  };
}

export function formatMilestone(value: number): string {
  if (value >= 1_000_000) return '$1M';
  return `$${value.toLocaleString('en-US')}`;
}

export function careerMilestones(peakValue: number): CareerMilestone[] {
  return CAREER_MILESTONES.map((value) => ({
    value,
    label: `${formatMilestone(value)} book`,
    earned: peakValue + 1e-9 >= value,
  }));
}

function holdingsValueByType(
  holdings: CareerHoldingMix[]
): Record<AssetType, number> & { unknown: number } {
  const out = { sealed: 0, single: 0, graded: 0, unknown: 0 };
  for (const row of holdings) {
    if (!(row.quantity > 0)) continue;
    const mark = row.markPrice ?? 0;
    const value = row.quantity * mark;
    if (row.assetType === 'sealed' || row.assetType === 'single' || row.assetType === 'graded') {
      out[row.assetType] += value;
    } else {
      out.unknown += value;
    }
  }
  return out;
}

export function investorArchetype(input: {
  cash: number;
  portfolioValue: number;
  holdings: CareerHoldingMix[];
  tradeCount: number;
}): CareerArchetype {
  const value = input.portfolioValue > 0 ? input.portfolioValue : 0;
  const cashRatio = value > 0 ? input.cash / value : 1;
  if (cashRatio >= 0.7) {
    return {
      id: 'cash-heavy',
      label: 'Cash Heavy',
      reason: 'Most of the book is still cash.',
    };
  }

  const mix = holdingsValueByType(input.holdings);
  const holdingsValue = mix.sealed + mix.single + mix.graded + mix.unknown;
  const share = (part: number) => (holdingsValue > 0 ? part / holdingsValue : 0);

  if (share(mix.sealed) >= 0.5) {
    return { id: 'sealed', label: 'Sealed Investor', reason: 'Majority of holdings are sealed product.' };
  }
  if (share(mix.single) >= 0.5) {
    return { id: 'singles', label: 'Singles Hunter', reason: 'Majority of holdings are singles.' };
  }
  if (share(mix.graded) >= 0.5) {
    return { id: 'graded', label: 'Grade Chaser', reason: 'Majority of holdings are graded cards.' };
  }

  const openPositions = input.holdings.filter((h) => h.quantity > 0).length;
  if (input.tradeCount >= 10 && openPositions <= 2) {
    return { id: 'trader', label: 'Active Trader', reason: 'Lots of fills, concentrated book.' };
  }

  return { id: 'balanced', label: 'Balanced Book', reason: 'Mix of cash and more than one product type.' };
}

/** Consecutive UTC calendar days with at least one career fill. Today or yesterday may still be live. */
export function tradeStreakUtc(executedAt: string[], now: Date = new Date()): number {
  const days = new Set<string>();
  for (const iso of executedAt) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    days.add(d.toISOString().slice(0, 10));
  }
  if (days.size === 0) return 0;

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  let cursor: Date;
  if (days.has(todayKey)) cursor = today;
  else if (days.has(yesterdayKey)) cursor = yesterday;
  else return 0;

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

export function careerAchievements(stats: CareerStats): Achievement[] {
  return [
    { id: 'first-buy', label: 'First career buy', earned: stats.buyCount >= 1 },
    { id: 'first-sell', label: 'First career sell', earned: stats.sellCount >= 1 },
    { id: 'profitable-sell', label: 'Banked a profitable sell', earned: stats.realizedPnl > 0 },
    { id: 'ten-trades', label: '10 career fills', earned: stats.tradeCount >= 10 },
    { id: 'three-assets', label: 'Own 3 different assets', earned: stats.distinctAssets >= 3 },
    { id: 'double', label: 'Grew the book past $2,000', earned: stats.peakValue >= 2000 },
    { id: 'ten-k', label: 'Hit a $10,000 book', earned: stats.peakValue >= 10000 },
  ];
}

export function careerChallenges(stats: CareerStats): Achievement[] {
  return [
    { id: 'five-trades', label: 'Make 5 career trades', earned: stats.tradeCount >= 5 },
    { id: 'streak-3', label: 'Trade on 3 straight days', earned: stats.streakDays >= 3 },
    { id: 'five-k', label: 'Reach a $5,000 peak', earned: stats.peakValue >= 5000 },
    { id: 'own-one', label: 'Hold at least one asset', earned: stats.distinctAssets >= 1 },
  ];
}

export function buildCareerProgression(input: {
  cash: number;
  currentValue: number;
  peakValue: number;
  holdings: CareerHoldingMix[];
  trades: HistoryTrade[];
  now?: Date;
}): CareerProgression {
  const buys = input.trades.filter((t) => t.side === 'buy');
  const sells = input.trades.filter((t) => t.side === 'sell');
  const realized = replayRealizedTrades(input.trades);
  const realizedPnl = roundMoney(realized.reduce((sum, t) => sum + t.pnl, 0));
  const distinctAssets = input.holdings.filter((h) => h.quantity > 0).length;
  const peakValue = Math.max(input.peakValue, input.currentValue);
  const stats: CareerStats = {
    tradeCount: input.trades.length,
    buyCount: buys.length,
    sellCount: sells.length,
    distinctAssets,
    realizedPnl,
    peakValue,
    currentValue: input.currentValue,
    returnPct: returnPct(input.currentValue, CAREER_STARTING_CASH),
    streakDays: tradeStreakUtc(
      input.trades.map((t) => t.executedAt),
      input.now ?? new Date()
    ),
  };

  return {
    level: careerLevelFromPeak(peakValue),
    archetype: investorArchetype({
      cash: input.cash,
      portfolioValue: input.currentValue,
      holdings: input.holdings,
      tradeCount: stats.tradeCount,
    }),
    milestones: careerMilestones(peakValue),
    stats,
    achievements: careerAchievements(stats),
    challenges: careerChallenges(stats),
  };
}
