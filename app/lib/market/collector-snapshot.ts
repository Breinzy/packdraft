import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset, PokeSet } from '@/lib/data';
import { getPriceHistory } from './prices';
import {
  getCatalogAsset,
  getCatalogAssetsByIds,
  getSet,
  listLatestQuoteAssetIds,
  listRecentAssets,
  listSetAssets,
  listSets,
  searchCatalog,
} from './catalog';
import { catalogAssetToUi, catalogSetToUi } from './ui-catalog';
import type { CatalogAsset } from '@/types';

const GAINERS = 180;
const LOSERS = 120;
const SEALED = 100;
const RECENT = 80;
const QUERY_PAGE = 16;
const SET_MEMBER_CAP = 400;
const HISTORY_LIMIT = 180;

/** Names the mock search palette already suggests — fetch real matches, do not invent them. */
const SNAPSHOT_QUERIES = [
  'Umbreon',
  'Charizard',
  'Pikachu',
  'Mewtwo',
  'Booster Box',
  'Elite Trainer',
  'Prismatic',
  '151',
];

function uniqueCatalog(assets: CatalogAsset[]): CatalogAsset[] {
  const seen = new Set<string>();
  const out: CatalogAsset[] = [];
  for (const asset of assets) {
    if (seen.has(asset.id)) continue;
    seen.add(asset.id);
    out.push(asset);
  }
  return out;
}

async function safe<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

export async function buildCollectorSnapshot(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<{ assets: Asset[]; sets: PokeSet[] }> {
  const sets = await listSets(supabase);
  const setById = new Map(sets.map((set) => [set.id, set]));

  const [gainerIds, loserIds, sealed, recent, queryHits] = await Promise.all([
    safe(listLatestQuoteAssetIds(supabase, { order: 'change_7d', ascending: false, limit: GAINERS }), []),
    safe(listLatestQuoteAssetIds(supabase, { order: 'change_7d', ascending: true, limit: LOSERS }), []),
    safe(searchCatalog(supabase, { assetType: 'sealed', page: 1, pageSize: SEALED }, now).then((r) => r.assets), []),
    safe(listRecentAssets(supabase, RECENT, now), []),
    Promise.all(
      SNAPSHOT_QUERIES.map((q) =>
        safe(searchCatalog(supabase, { q, page: 1, pageSize: QUERY_PAGE }, now).then((r) => r.assets), [])
      )
    ),
  ]);

  const quoted = await safe(getCatalogAssetsByIds(supabase, [...gainerIds, ...loserIds], now), []);
  const catalogAssets = uniqueCatalog([...quoted, ...sealed, ...recent, ...queryHits.flat()]);
  const assets = catalogAssets.map((asset) =>
    catalogAssetToUi(asset, asset.set_id ? setById.get(asset.set_id) : undefined)
  );
  const uiSets = sets.map((set) => catalogSetToUi(set, assets.filter((asset) => asset.setId === set.id)));

  return { assets, sets: uiSets };
}

export async function buildSetDetail(
  supabase: SupabaseClient,
  setId: string,
  now: Date = new Date()
): Promise<{ set: PokeSet | null; assets: Asset[] }> {
  const set = await getSet(supabase, setId);
  if (!set) return { set: null, assets: [] };
  const members = await listSetAssets(supabase, setId, { cap: SET_MEMBER_CAP, now });
  const assets = members.map((asset) => catalogAssetToUi(asset, set));
  return { set: catalogSetToUi(set, assets), assets };
}

export async function buildAssetDetail(
  supabase: SupabaseClient,
  assetId: string,
  now: Date = new Date()
): Promise<{ asset: Asset | null; set: PokeSet | null; related: Asset[] }> {
  const catalog = await getCatalogAsset(supabase, assetId, now);
  if (!catalog) return { asset: null, set: null, related: [] };

  const [set, history] = await Promise.all([
    catalog.set_id ? getSet(supabase, catalog.set_id) : Promise.resolve(null),
    getPriceHistory(supabase, assetId, { limit: HISTORY_LIMIT, before: now }),
  ]);

  const recorded = history.map((point) => point.price);
  const asset = catalogAssetToUi(catalog, set, recorded);

  let related: Asset[] = [];
  if (catalog.set_id) {
    const page = await safe(
      searchCatalog(supabase, { setId: catalog.set_id, page: 1, pageSize: 8 }, now),
      { assets: [] as CatalogAsset[], total: 0, page: 1, pageSize: 8 }
    );
    related = page.assets
      .filter((row) => row.id !== catalog.id)
      .slice(0, 4)
      .map((row) => catalogAssetToUi(row, set));
  }

  return {
    asset,
    set: set ? catalogSetToUi(set, [asset, ...related]) : null,
    related,
  };
}
