import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset, PokeSet } from '@/lib/data';
import { getPriceHistory, getPricesAt } from './prices';
import {
  getCatalogAsset,
  getCatalogAssetsByIds,
  getSet,
  listLatestQuoteAssetIds,
  listRecentAssets,
  listSetAssets,
  listSetIndexesAt,
  listSetLatestIndexes,
  listSetMemberIds,
  listSetPriceObservations,
  listSets,
  searchCatalog,
  listAssetVolumeStats,
} from './catalog';
import { catalogAssetToUi, catalogSetToUi } from './ui-catalog';
import { buildSetIndex, emptySetIndex, observationDayBaskets, sampledIndexHistory } from './set-index';
import type { CatalogAsset } from '@/types';

const GAINERS = 180;
const LOSERS = 120;
const SEALED = 100;
const RECENT = 80;
const QUERY_PAGE = 16;
const SET_MEMBER_CAP = 400;
const HISTORY_LIMIT = 180;
const INDEX_LOOKBACK_DAYS = 180;
const MS_HOUR = 60 * 60 * 1000;

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

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * MS_HOUR);
}

function sortSets(sets: PokeSet[]): PokeSet[] {
  return [...sets].sort((a, b) => {
    const change = Math.abs(b.change30d) - Math.abs(a.change30d);
    if (change !== 0) return change;
    if (b.price !== a.price) return b.price - a.price;
    return a.name.localeCompare(b.name);
  });
}

export async function buildCollectorSnapshot(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<{ assets: Asset[]; sets: PokeSet[] }> {
  const at24h = new Date(now.getTime() - 24 * MS_HOUR);
  const at7d = daysAgo(now, 7);
  const at30d = daysAgo(now, 30);

  const sets = await listSets(supabase);
  const setById = new Map(sets.map((set) => [set.id, set]));

  const [gainerIds, loserIds, sealed, recent, queryHits, latestIndexes, indexes7d, indexes30d, indexes180d] =
    await Promise.all([
    safe(listLatestQuoteAssetIds(supabase, { order: 'change_7d', ascending: false, limit: GAINERS }), []),
    safe(listLatestQuoteAssetIds(supabase, { order: 'change_7d', ascending: true, limit: LOSERS }), []),
    safe(searchCatalog(supabase, { assetType: 'sealed', page: 1, pageSize: SEALED }, now).then((r) => r.assets), []),
    safe(listRecentAssets(supabase, RECENT, now), []),
    Promise.all(
      SNAPSHOT_QUERIES.map((q) =>
        safe(searchCatalog(supabase, { q, page: 1, pageSize: QUERY_PAGE }, now).then((r) => r.assets), [])
      )
    ),
    safe(listSetLatestIndexes(supabase), new Map()),
    safe(listSetIndexesAt(supabase, daysAgo(now, 7)), new Map()),
    safe(listSetIndexesAt(supabase, at30d), new Map()),
    safe(listSetIndexesAt(supabase, daysAgo(now, INDEX_LOOKBACK_DAYS)), new Map()),
  ]);

  const quoted = await safe(getCatalogAssetsByIds(supabase, [...gainerIds, ...loserIds], now), []);
  const catalogAssets = uniqueCatalog([...quoted, ...sealed, ...recent, ...queryHits.flat()]);
  const assetIds = catalogAssets.map((asset) => asset.id);
  const [prices24h, prices7d, prices30d, volumes] = await Promise.all([
    safe(getPricesAt(supabase, at24h, assetIds), new Map()),
    safe(getPricesAt(supabase, at7d, assetIds), new Map()),
    safe(getPricesAt(supabase, at30d, assetIds), new Map()),
    safe(listAssetVolumeStats(supabase, assetIds), new Map()),
  ]);

  const assets = catalogAssets.map((asset) =>
    catalogAssetToUi(
      { ...asset, volume: volumes.get(asset.id) ?? asset.volume },
      asset.set_id ? setById.get(asset.set_id) : undefined,
      undefined,
      {
        price24h: prices24h.get(asset.id),
        price7d: prices7d.get(asset.id),
        price30d: prices30d.get(asset.id),
      }
    )
  );

  const uiSets = sets.map((set) => {
    const row = latestIndexes.get(set.id);
    const current = row?.index_price ?? 0;
    const index = buildSetIndex({
      currentPrice: current,
      price30d: indexes30d.get(set.id) ?? null,
      history: sampledIndexHistory([
        indexes180d.get(set.id),
        indexes30d.get(set.id),
        indexes7d.get(set.id),
        current,
      ]),
      trackedCount: row?.tracked_count ?? 0,
      sealedCount: row?.sealed_count ?? 0,
      cardCount: row?.card_count ?? 0,
      pricedCount: row?.priced_count ?? 0,
    });
    return catalogSetToUi(set, index);
  });

  return { assets, sets: sortSets(uiSets) };
}

export async function buildSetDetail(
  supabase: SupabaseClient,
  setId: string,
  now: Date = new Date()
): Promise<{ set: PokeSet | null; assets: Asset[] }> {
  const set = await getSet(supabase, setId);
  if (!set) return { set: null, assets: [] };

  const at24h = new Date(now.getTime() - 24 * MS_HOUR);
  const at7d = daysAgo(now, 7);
  const at30d = daysAgo(now, 30);
  const since = daysAgo(now, INDEX_LOOKBACK_DAYS);

  const [members, latestIndexes, indexes30d, memberIds] = await Promise.all([
    listSetAssets(supabase, setId, { cap: SET_MEMBER_CAP, now }),
    safe(listSetLatestIndexes(supabase), new Map()),
    safe(listSetIndexesAt(supabase, at30d), new Map()),
    safe(listSetMemberIds(supabase, setId), []),
  ]);

  const memberAssetIds = members.map((asset) => asset.id);
  const [prices24h, prices7d, prices30d, observations, volumes] = await Promise.all([
    safe(getPricesAt(supabase, at24h, memberAssetIds), new Map()),
    safe(getPricesAt(supabase, at7d, memberAssetIds), new Map()),
    safe(getPricesAt(supabase, at30d, memberAssetIds), new Map()),
    safe(listSetPriceObservations(supabase, memberIds, since), []),
    safe(listAssetVolumeStats(supabase, memberAssetIds), new Map()),
  ]);

  const assets = members.map((asset) =>
    catalogAssetToUi(
      { ...asset, volume: volumes.get(asset.id) ?? asset.volume },
      set,
      undefined,
      {
        price24h: prices24h.get(asset.id),
        price7d: prices7d.get(asset.id),
        price30d: prices30d.get(asset.id),
      }
    )
  );

  const row = latestIndexes.get(set.id);
  const history = observationDayBaskets(observations, now);
  const index = buildSetIndex({
    currentPrice: row?.index_price ?? 0,
    price30d: indexes30d.get(set.id) ?? null,
    history,
    trackedCount: row?.tracked_count ?? memberIds.length,
    sealedCount: row?.sealed_count ?? assets.filter((asset) => asset.type === 'sealed').length,
    cardCount: row?.card_count ?? assets.filter((asset) => asset.type === 'card').length,
    pricedCount: row?.priced_count ?? assets.filter((asset) => asset.price > 0).length,
  });

  return { set: catalogSetToUi(set, index), assets };
}

function priceAtOrBefore(
  history: { price: number; recordedAt: string }[],
  at: Date
): number | undefined {
  const cutoff = at.getTime();
  let found: number | undefined;
  for (const point of history) {
    const time = new Date(point.recordedAt).getTime();
    if (!Number.isFinite(time) || time > cutoff) continue;
    found = point.price;
  }
  return found;
}

export async function buildAssetDetail(
  supabase: SupabaseClient,
  assetId: string,
  now: Date = new Date()
): Promise<{ asset: Asset | null; set: PokeSet | null; related: Asset[] }> {
  const catalog = await getCatalogAsset(supabase, assetId, now);
  if (!catalog) return { asset: null, set: null, related: [] };

  const [set, history, latestIndexes, indexes30d, volumes] = await Promise.all([
    catalog.set_id ? getSet(supabase, catalog.set_id) : Promise.resolve(null),
    getPriceHistory(supabase, assetId, { limit: HISTORY_LIMIT, before: now }),
    safe(listSetLatestIndexes(supabase), new Map()),
    safe(listSetIndexesAt(supabase, daysAgo(now, 30)), new Map()),
    safe(listAssetVolumeStats(supabase, [assetId]), new Map()),
  ]);

  const recorded = history.map((point) => point.price);
  const asset = catalogAssetToUi(
    { ...catalog, volume: volumes.get(catalog.id) ?? catalog.volume },
    set,
    recorded,
    {
      price24h: priceAtOrBefore(history, new Date(now.getTime() - 24 * MS_HOUR)),
      price7d: priceAtOrBefore(history, daysAgo(now, 7)),
      price30d: priceAtOrBefore(history, daysAgo(now, 30)),
    }
  );

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

  const row = catalog.set_id ? latestIndexes.get(catalog.set_id) : undefined;
  const index = catalog.set_id
    ? buildSetIndex({
        currentPrice: row?.index_price ?? 0,
        price30d: indexes30d.get(catalog.set_id) ?? null,
        trackedCount: row?.tracked_count ?? 0,
        sealedCount: row?.sealed_count ?? 0,
        cardCount: row?.card_count ?? 0,
        pricedCount: row?.priced_count ?? 0,
      })
    : emptySetIndex();

  return {
    asset,
    set: set ? catalogSetToUi(set, index) : null,
    related,
  };
}
