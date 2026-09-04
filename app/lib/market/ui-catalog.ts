import type { CatalogAsset } from '@/types';
import type { Asset, EnergyType, PokeSet } from '@/lib/data';
import type { CatalogSet } from './catalog';

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
  recordedHistory?: number[]
): Asset {
  const price = asset.price ?? 0;
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
    change24h: 0,
    change7d: asset.change_7d ?? 0,
    change30d: 0,
    volume: asset.volume ?? 0,
    watchers: 0,
    releasedAt: asset.set_release_date ?? set?.release_date ?? '',
    history: honestHistory(price, recordedHistory),
  };
}

function averageMemberPrice(members: Asset[]): number {
  const priced = members.filter((asset) => asset.price > 0);
  if (priced.length === 0) return 0;
  const sum = priced.reduce((total, asset) => total + asset.price, 0);
  return Number((sum / priced.length).toFixed(2));
}

export function catalogSetToUi(set: CatalogSet, members: Asset[] = []): PokeSet {
  const price = averageMemberPrice(members);
  return {
    id: set.id,
    name: set.name,
    code: setCode(set),
    releasedAt: set.release_date ?? '',
    cardCount: set.asset_count,
    logoColor: setLogoColor(set.id),
    price,
    change30d: 0,
    history: honestHistory(price),
  };
}
