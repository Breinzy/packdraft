import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentPrices } from './prices';
import type { Asset, AssetType, CatalogAsset } from '@/types';

export const PAGE_SIZE = 24;

export interface CatalogQuery {
  q?: string;
  assetType?: AssetType | 'all';
  setId?: string;
  tcgSlug?: string;
  page?: number;
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
  sets: { name: string } | { name: string }[] | null;
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
    price: quote?.price ?? null,
    recorded_at: quote?.recordedAt ?? null,
    change_7d: quote?.change7d ?? null,
    volume: quote?.volume ?? null,
    source: quote?.source ?? null,
    price_type: quote?.priceType ?? null,
    condition: quote?.condition ?? null,
    stale: quote ? quote.stale : true,
  };
}

export async function searchCatalog(
  supabase: SupabaseClient,
  query: CatalogQuery = {},
  now: Date = new Date()
): Promise<{ assets: CatalogAsset[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from('assets')
    .select(
      `
      id, name, asset_type, image_url, external_id, metadata, tcg_id, set_id,
      tcgs ( name, slug ),
      sets ( name )
    `,
      { count: 'exact' }
    )
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
    pageSize: PAGE_SIZE,
  };
}

export async function getCatalogAsset(
  supabase: SupabaseClient,
  assetId: string,
  now: Date = new Date()
): Promise<CatalogAsset | null> {
  const { data, error } = await supabase
    .from('assets')
    .select(
      `
      id, name, asset_type, image_url, external_id, metadata, tcg_id, set_id,
      tcgs ( name, slug ),
      sets ( name )
    `
    )
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load asset: ${error.message}`);
  }
  if (!data) return null;
  const prices = await getCurrentPrices(supabase, [assetId], now);
  return toCatalogAsset(data as AssetRow, prices);
}

export async function listSets(
  supabase: SupabaseClient,
  tcgSlug = 'pokemon'
): Promise<{ id: string; name: string }[]> {
  const { data: tcg, error: tcgError } = await supabase
    .from('tcgs')
    .select('id')
    .eq('slug', tcgSlug)
    .maybeSingle();
  if (tcgError) throw new Error(`Failed to load TCG: ${tcgError.message}`);
  if (!tcg) return [];

  const { data, error } = await supabase
    .from('sets')
    .select('id, name')
    .eq('tcg_id', tcg.id)
    .order('name', { ascending: true });
  if (error) throw new Error(`Failed to load sets: ${error.message}`);
  return data ?? [];
}

export function asAsset(catalog: CatalogAsset): Pick<Asset, 'image_url' | 'external_id'> {
  return { image_url: catalog.image_url, external_id: catalog.external_id };
}
