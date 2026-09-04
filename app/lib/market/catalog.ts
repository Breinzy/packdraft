import type { SupabaseClient } from '@supabase/supabase-js';
import { chunkIds, getCurrentPrices } from './prices';
import type { Asset, AssetType, CatalogAsset } from '@/types';

export const PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 200;

export interface CatalogQuery {
  q?: string;
  assetType?: AssetType | 'all';
  setId?: string;
  tcgSlug?: string;
  page?: number;
  pageSize?: number;
}

interface AssetRow {
  id: string;
  name: string;
  asset_type: AssetType;
  image_url: string | null;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
  tcg_id: string;
  set_id: string | null;
  tcgs: { name: string; slug: string } | { name: string; slug: string }[] | null;
  sets:
    | { name: string; slug?: string | null; release_date?: string | null }
    | { name: string; slug?: string | null; release_date?: string | null }[]
    | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toCatalogAsset(
  row: AssetRow,
  prices: Awaited<ReturnType<typeof getCurrentPrices>>
): CatalogAsset {
  const tcg = one(row.tcgs);
  const set = one(row.sets);
  const quote = prices.get(row.id);
  return {
    id: row.id,
    name: row.name,
    asset_type: row.asset_type,
    image_url: row.image_url,
    external_id: row.external_id,
    metadata: row.metadata ?? {},
    tcg_id: row.tcg_id,
    tcg_name: tcg?.name ?? null,
    tcg_slug: tcg?.slug ?? null,
    set_id: row.set_id,
    set_name: set?.name ?? null,
    set_slug: set?.slug ?? null,
    set_release_date: set?.release_date ?? null,
    price: quote?.price ?? null,
    recorded_at: quote?.recordedAt ?? null,
    change_7d: quote?.change7d ?? null,
    volume: quote?.volume ?? null,
    source: quote?.source ?? null,
    price_type: quote?.priceType ?? null,
    condition: quote?.condition ?? null,
    stale: quote ? quote.stale : false,
  };
}

const ASSET_SELECT = `
  id, name, asset_type, image_url, external_id, metadata, tcg_id, set_id,
  tcgs ( name, slug ),
  sets ( name, slug, release_date )
`;

function resolvePageSize(query: CatalogQuery): number {
  const requested = query.pageSize ?? PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(requested)));
}

export async function searchCatalog(
  supabase: SupabaseClient,
  query: CatalogQuery = {},
  now: Date = new Date()
): Promise<{ assets: CatalogAsset[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = resolvePageSize(query);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('assets')
    .select(ASSET_SELECT, { count: 'exact' })
    .eq('active', true)
    .order('name', { ascending: true })
    .range(from, to);

  if (query.q?.trim()) {
    q = q.ilike('name', `%${query.q.trim()}%`);
  }
  if (query.assetType && query.assetType !== 'all') {
    q = q.eq('asset_type', query.assetType);
  }
  if (query.setId) {
    q = q.eq('set_id', query.setId);
  }
  if (query.tcgSlug) {
    const { data: tcg } = await supabase
      .from('tcgs')
      .select('id')
      .eq('slug', query.tcgSlug)
      .maybeSingle();
    if (tcg?.id) q = q.eq('tcg_id', tcg.id);
  }

  const { data, error, count } = await q;
  if (error) {
    throw new Error(`Failed to search assets: ${error.message}`);
  }

  const rows = (data ?? []) as AssetRow[];
  const prices = await getCurrentPrices(
    supabase,
    rows.map((r) => r.id),
    now
  );

  return {
    assets: rows.map((row) => toCatalogAsset(row, prices)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getCatalogAsset(
  supabase: SupabaseClient,
  assetId: string,
  now: Date = new Date()
): Promise<CatalogAsset | null> {
  const { data, error } = await supabase
    .from('assets')
    .select(ASSET_SELECT)
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load asset: ${error.message}`);
  }
  if (!data) return null;
  const prices = await getCurrentPrices(supabase, [assetId], now);
  return toCatalogAsset(data as AssetRow, prices);
}

export async function getCatalogAssetsByIds(
  supabase: SupabaseClient,
  assetIds: string[],
  now: Date = new Date()
): Promise<CatalogAsset[]> {
  const chunks = chunkIds(assetIds);
  if (chunks.length === 0) return [];

  const rows: AssetRow[] = [];
  for (const chunk of chunks) {
    const { data, error } = await supabase.from('assets').select(ASSET_SELECT).in('id', chunk).eq('active', true);
    if (error) {
      throw new Error(`Failed to load assets: ${error.message}`);
    }
    rows.push(...((data ?? []) as AssetRow[]));
  }

  const prices = await getCurrentPrices(
    supabase,
    rows.map((row) => row.id),
    now
  );
  const byId = new Map(rows.map((row) => [row.id, toCatalogAsset(row, prices)]));
  return assetIds.map((id) => byId.get(id)).filter((asset): asset is CatalogAsset => Boolean(asset));
}

export async function listLatestQuoteAssetIds(
  supabase: SupabaseClient,
  options: {
    order: 'change_7d' | 'volume' | 'recorded_at';
    ascending?: boolean;
    limit: number;
  }
): Promise<string[]> {
  const { data, error } = await supabase
    .from('asset_latest_prices')
    .select('asset_id')
    .order(options.order, { ascending: options.ascending ?? false })
    .limit(Math.max(1, options.limit));

  if (error) {
    throw new Error(`Failed to load latest prices: ${error.message}`);
  }
  return (data ?? []).map((row) => row.asset_id).filter((id): id is string => Boolean(id));
}

export async function listRecentAssets(
  supabase: SupabaseClient,
  limit = 80,
  now: Date = new Date()
): Promise<CatalogAsset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select(ASSET_SELECT)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, limit));

  if (error) {
    throw new Error(`Failed to load recent assets: ${error.message}`);
  }
  const rows = (data ?? []) as AssetRow[];
  const prices = await getCurrentPrices(
    supabase,
    rows.map((row) => row.id),
    now
  );
  return rows.map((row) => toCatalogAsset(row, prices));
}

export async function listSetAssets(
  supabase: SupabaseClient,
  setId: string,
  options: { cap?: number; now?: Date } = {}
): Promise<CatalogAsset[]> {
  const cap = options.cap ?? 400;
  const now = options.now ?? new Date();
  const pageSize = MAX_PAGE_SIZE;
  const assets: CatalogAsset[] = [];
  let page = 1;

  while (assets.length < cap) {
    const result = await searchCatalog(
      supabase,
      { setId, page, pageSize: Math.min(pageSize, cap - assets.length) },
      now
    );
    assets.push(...result.assets);
    if (result.assets.length === 0 || assets.length >= result.total || result.assets.length < result.pageSize) {
      break;
    }
    page += 1;
  }

  return assets.slice(0, cap);
}

export type CatalogSet = {
  id: string;
  name: string;
  slug: string | null;
  release_date: string | null;
  asset_count: number;
};

type SetRow = {
  id: string;
  name: string;
  slug: string | null;
  release_date: string | null;
  assets?: { count: number }[] | { count: number } | null;
};

function setAssetCount(row: SetRow): number {
  const nested = row.assets;
  if (!nested) return 0;
  const first = Array.isArray(nested) ? nested[0] : nested;
  return Number(first?.count ?? 0);
}

export async function listSets(
  supabase: SupabaseClient,
  tcgSlug = 'pokemon'
): Promise<CatalogSet[]> {
  const { data: tcg, error: tcgError } = await supabase
    .from('tcgs')
    .select('id')
    .eq('slug', tcgSlug)
    .maybeSingle();
  if (tcgError) throw new Error(`Failed to load TCG: ${tcgError.message}`);
  if (!tcg) return [];

  const withCounts = await supabase
    .from('sets')
    .select('id, name, slug, release_date, assets(count)')
    .eq('tcg_id', tcg.id)
    .order('name', { ascending: true });

  if (!withCounts.error && withCounts.data) {
    return (withCounts.data as SetRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug ?? null,
      release_date: row.release_date ?? null,
      asset_count: setAssetCount(row),
    }));
  }

  const { data, error } = await supabase
    .from('sets')
    .select('id, name, slug, release_date')
    .eq('tcg_id', tcg.id)
    .order('name', { ascending: true });
  if (error) throw new Error(`Failed to load sets: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    release_date: row.release_date ?? null,
    asset_count: 0,
  }));
}

export async function getSet(
  supabase: SupabaseClient,
  setId: string
): Promise<CatalogSet | null> {
  const withCounts = await supabase
    .from('sets')
    .select('id, name, slug, release_date, assets(count)')
    .eq('id', setId)
    .maybeSingle();

  if (!withCounts.error && withCounts.data) {
    const row = withCounts.data as SetRow;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug ?? null,
      release_date: row.release_date ?? null,
      asset_count: setAssetCount(row),
    };
  }

  const { data, error } = await supabase
    .from('sets')
    .select('id, name, slug, release_date')
    .eq('id', setId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load set: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug ?? null,
    release_date: data.release_date ?? null,
    asset_count: 0,
  };
}

export type SetIndexRow = {
  set_id: string;
  index_price: number;
  tracked_count: number;
  sealed_count: number;
  card_count: number;
  priced_count: number;
};

export async function listSetLatestIndexes(supabase: SupabaseClient): Promise<Map<string, SetIndexRow>> {
  const byId = new Map<string, SetIndexRow>();
  const { data, error } = await supabase
    .from('set_latest_indexes')
    .select('set_id, index_price, tracked_count, sealed_count, card_count, priced_count');
  if (error) {
    throw new Error(`Failed to load set indexes: ${error.message}`);
  }
  for (const row of data ?? []) {
    if (!row.set_id) continue;
    byId.set(row.set_id, {
      set_id: row.set_id,
      index_price: Number(row.index_price ?? 0),
      tracked_count: Number(row.tracked_count ?? 0),
      sealed_count: Number(row.sealed_count ?? 0),
      card_count: Number(row.card_count ?? 0),
      priced_count: Number(row.priced_count ?? 0),
    });
  }
  return byId;
}

export async function listSetIndexesAt(
  supabase: SupabaseClient,
  at: Date
): Promise<Map<string, number>> {
  const byId = new Map<string, number>();
  const { data, error } = await supabase.rpc('set_indexes_at', { p_at: at.toISOString() });
  if (error) {
    throw new Error(`Failed to load historical set indexes: ${error.message}`);
  }
  for (const row of data ?? []) {
    if (!row.set_id) continue;
    const price = Number(row.index_price ?? 0);
    if (price > 0) byId.set(row.set_id as string, price);
  }
  return byId;
}

export async function listSetMemberIds(supabase: SupabaseClient, setId: string): Promise<string[]> {
  const ids: string[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('assets')
      .select('id')
      .eq('set_id', setId)
      .eq('active', true)
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error(`Failed to load set members: ${error.message}`);
    }
    const rows = data ?? [];
    for (const row of rows) {
      if (row.id) ids.push(row.id as string);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

export async function listSetPriceObservations(
  supabase: SupabaseClient,
  memberIds: string[],
  since: Date
): Promise<{ assetId: string; price: number; recordedAt: string }[]> {
  const observations: { assetId: string; price: number; recordedAt: string }[] = [];
  const pageSize = 1000;
  for (const chunk of chunkIds(memberIds)) {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('price_snapshots')
        .select('asset_id, price, recorded_at')
        .in('asset_id', chunk)
        .gt('price', 0)
        .gte('recorded_at', since.toISOString())
        .order('recorded_at', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        throw new Error(`Failed to load set price observations: ${error.message}`);
      }
      const rows = data ?? [];
      for (const row of rows) {
        if (!row.asset_id) continue;
        observations.push({
          assetId: row.asset_id as string,
          price: Number(row.price),
          recordedAt: row.recorded_at as string,
        });
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
  }
  return observations;
}

export function asAsset(catalog: CatalogAsset): Pick<Asset, 'image_url' | 'external_id'> {
  return { image_url: catalog.image_url, external_id: catalog.external_id };
}
