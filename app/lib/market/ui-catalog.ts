import type { CatalogAsset } from '@/types';
import type { Asset, EnergyType, PokeSet } from '@/lib/data';
import type { CatalogSet } from './catalog';
import { computeChangePct } from './stale';
import type { SetIndex } from './set-index';
import { emptySetIndex } from './set-index';

const ENERGY: ReadonlySet<string> = new Set([
  'lightning',
  'psychic',
  'fire',
  'water',
  'grass',
  'darkness',
  'dragon',
  'colorless',
]);

const SEALED_TAGS: Record<string, string> = {
  booster_box: 'Booster Box',
  etb: 'Elite Trainer Box',
  premium_collection: 'Premium Collection',
  booster_bundle: 'Booster Bundle',
  upc: 'Ultra Premium Collection',
};

function metaString(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export function energyFromMetadata(metadata: Record<string, unknown>): EnergyType {
  const direct = metaString(metadata, 'energy')?.toLowerCase();
  if (direct && ENERGY.has(direct)) return direct as EnergyType;
  const types = metadata.types;
  if (Array.isArray(types)) {
    const first = String(types[0] ?? '')
      .trim()
      .toLowerCase();
    if (ENERGY.has(first)) return first as EnergyType;
  }
  return 'colorless';
}

export function subtitleFromCatalog(asset: CatalogAsset): string {
  const metadata = asset.metadata ?? {};
  const number = metaString(metadata, 'cardNumber') ?? metaString(metadata, 'number');
  if (number) return number;
  const subtype = metaString(metadata, 'sealedSubtype');
  if (subtype && SEALED_TAGS[subtype]) return SEALED_TAGS[subtype];
  const grade = metadata.grade;
  if (typeof grade === 'number') return `PSA ${grade}`;
  if (typeof grade === 'string' && grade.trim() && grade !== 'null') return grade;
  return asset.condition?.trim() || '';
}

export function tagFromCatalog(asset: CatalogAsset): string {
  const metadata = asset.metadata ?? {};
  const rarity = metaString(metadata, 'rarity');
  if (rarity) return rarity;
  const subtype = metaString(metadata, 'sealedSubtype');
  if (subtype && SEALED_TAGS[subtype]) return SEALED_TAGS[subtype];
  if (asset.asset_type === 'graded') {
    const grade = metadata.grade;
    if (typeof grade === 'number') return `PSA ${grade}`;
    return 'Graded';
  }
  if (asset.asset_type === 'sealed') return 'Sealed';
  return 'Card';
}

export function setCode(set: Pick<CatalogSet, 'name' | 'slug'>): string {
  if (set.slug) {
    const initials = set.slug
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
    if (initials.length >= 2) return initials.slice(0, 4);
    return set.slug.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase();
  }
  return set.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

export function setLogoColor(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  return `oklch(0.7 0.14 ${hue})`;
}

export function honestHistory(price: number, recorded?: number[]): number[] {
  if (recorded && recorded.length > 0) {
    return recorded.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
  }
  if (Number.isFinite(price) && price > 0) return [Number(price.toFixed(2))];
  return [];
}

export function catalogAssetToUi(
  asset: CatalogAsset,
  set?: CatalogSet | null,
  recordedHistory?: number[],
  prior?: { price24h?: number; price7d?: number; price30d?: number }
): Asset {
  const price = asset.price ?? 0;
  const change24h = prior?.price24h != null ? Number(computeChangePct(price, prior.price24h).toFixed(2)) : 0;
  const stored7d = asset.change_7d ?? 0;
  const change7d =
    stored7d !== 0 ? stored7d : prior?.price7d != null ? Number(computeChangePct(price, prior.price7d).toFixed(2)) : 0;
  const change30d = prior?.price30d != null ? Number(computeChangePct(price, prior.price30d).toFixed(2)) : 0;
  const historyPoints = recordedHistory?.length
    ? recordedHistory
    : [prior?.price30d, prior?.price7d, prior?.price24h, price].filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
      );
  return {
    id: asset.id,
    type: asset.asset_type === 'sealed' ? 'sealed' : 'card',
    name: asset.name,
    subtitle: subtitleFromCatalog(asset),
    setId: asset.set_id ?? '',
    setName: asset.set_name ?? set?.name ?? 'Unknown',
    tag: tagFromCatalog(asset),
    energy: energyFromMetadata(asset.metadata ?? {}),
    price,
    change24h,
    change7d,
    change30d,
    volume: asset.volume ?? 0,
    watchers: 0,
    releasedAt: asset.set_release_date ?? set?.release_date ?? '',
    history: honestHistory(price, historyPoints),
  };
}

export function catalogSetToUi(set: CatalogSet, index: SetIndex = emptySetIndex()): PokeSet {
  return {
    id: set.id,
    name: set.name,
    code: setCode(set),
    releasedAt: set.release_date ?? '',
    cardCount: set.asset_count,
    trackedCount: index.trackedCount,
    sealedCount: index.sealedCount,
    logoColor: setLogoColor(set.id),
    price: index.price,
    change30d: index.change30d,
    history: index.history.length ? index.history : honestHistory(index.price),
  };
}
