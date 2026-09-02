import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset, MarketEvent, MarketEventAsset, MarketEventStanding } from '@/types';
import { tickEventStatus } from './lifecycle';
import { parseCreateMarketEventInput, type CreateMarketEventInput } from './admin';

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapMarketEvent(row: Record<string, unknown>): MarketEvent {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    type: row.type as MarketEvent['type'],
    status: tickEventStatus(
      row.status as MarketEvent['status'],
      row.opens_at as string,
      row.locks_at as string,
      row.settles_at as string
    ),
    opens_at: row.opens_at as string,
    locks_at: row.locks_at as string,
    settles_at: row.settles_at as string,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    settled_at: (row.settled_at as string | null) ?? null,
  };
}

export async function listMarketEvents(supabase: SupabaseClient): Promise<MarketEvent[]> {
  const { data, error } = await supabase
    .from('market_events')
    .select('*')
    .order('opens_at', { ascending: false });
  if (error) throw new Error(`Failed to load events: ${error.message}`);
  return (data ?? []).map((row) => mapMarketEvent(row as Record<string, unknown>));
}

export async function getMarketEvent(
  supabase: SupabaseClient,
  id: string
): Promise<MarketEvent | null> {
  const { data, error } = await supabase.from('market_events').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load event: ${error.message}`);
  if (!data) return null;
  return mapMarketEvent(data as Record<string, unknown>);
}

export async function getMarketEventAssets(
  supabase: SupabaseClient,
  eventId: string
): Promise<MarketEventAsset[]> {
  const { data, error } = await supabase
    .from('market_event_assets')
    .select('*, assets (*)')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to load event assets: ${error.message}`);

  return (data ?? []).map((row) => {
    const assetRaw = row.assets as Asset | Asset[] | null;
    const asset = Array.isArray(assetRaw) ? (assetRaw[0] ?? null) : assetRaw;
    return {
      event_id: row.event_id as string,
      asset_id: row.asset_id as string,
      sort_order: Number(row.sort_order ?? 0),
      start_price: asNumber(row.start_price as number | null),
      end_price: asNumber(row.end_price as number | null),
      start_method: (row.start_method as string | null) ?? null,
      end_method: (row.end_method as string | null) ?? null,
      asset,
    };
  });
}

export async function getOwnEventEntry(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<{ payload: unknown; submitted_at: string } | null> {
  const { data, error } = await supabase
    .from('market_event_entries')
    .select('payload, submitted_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load event entry: ${error.message}`);
  if (!data) return null;
  return { payload: data.payload, submitted_at: data.submitted_at as string };
}

export async function getEventResults(
  supabase: SupabaseClient,
  eventId: string
): Promise<MarketEventStanding[]> {
  const { data, error } = await supabase
    .from('market_event_results')
    .select('user_id, score, rank')
    .eq('event_id', eventId)
    .order('rank', { ascending: true });
  if (error) throw new Error(`Failed to load event results: ${error.message}`);

  const rows = data ?? [];
  const ids = rows.map((row) => row.user_id as string);
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids);
    for (const profile of profiles ?? []) {
      const display =
        (profile.display_name as string | null) ||
        String(profile.email ?? '')
          .split('@')[0] ||
        'Player';
      names.set(profile.id as string, display);
    }
  }

  return rows.map((row) => ({
    user_id: row.user_id as string,
    display_name: names.get(row.user_id as string) ?? 'Player',
    score: Number(row.score ?? 0),
    rank: Number(row.rank),
    frozen: true,
  }));
}

export async function pickPricedAssets(
  service: SupabaseClient,
  count: number
): Promise<string[]> {
  const { data, error } = await service
    .from('asset_latest_prices')
    .select('asset_id, price, volume')
    .gt('price', 1)
    .order('volume', { ascending: false })
    .limit(Math.max(count * 4, 20));
  if (error) throw new Error(`Failed to pick event assets: ${error.message}`);

  const ids = (data ?? [])
    .map((row) => row.asset_id as string)
    .filter(Boolean);
  const unique = [...new Set(ids)];
  if (unique.length < count) {
    throw new Error('Not enough priced assets to create this event. Sync prices first.');
  }
  return unique.slice(0, count);
}

export async function createMarketEvent(
  service: SupabaseClient,
  input: CreateMarketEventInput & { createdBy?: string | null }
): Promise<{ id: string }> {
  const parsed = parseCreateMarketEventInput(input);
  const assetIds =
    parsed.assetIds.length > 0
      ? parsed.assetIds
      : await pickPricedAssets(service, parsed.assetCount);

  const status = parsed.opensAt.getTime() <= Date.now() ? 'open' : 'upcoming';

  const { data, error } = await service
    .from('market_events')
    .insert({
      name: parsed.name,
      description: parsed.description,
      type: parsed.type,
      status,
      opens_at: parsed.opensAt.toISOString(),
      locks_at: parsed.locksAt.toISOString(),
      settles_at: parsed.settlesAt.toISOString(),
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to create event: ${error?.message ?? 'unknown error'}`);
  }

  const rows = assetIds.map((assetId, index) => ({
    event_id: data.id as string,
    asset_id: assetId,
    sort_order: index,
  }));
  const { error: assetError } = await service.from('market_event_assets').insert(rows);
  if (assetError) {
    await service.from('market_events').delete().eq('id', data.id);
    throw new Error(`Failed to attach event assets: ${assetError.message}`);
  }

  if (status === 'open') {
    const { error: freezeError } = await service.rpc('freeze_market_event_prices', {
      p_event_id: data.id,
      p_phase: 'start',
      p_as_of: parsed.opensAt.toISOString(),
    });
    if (freezeError) {
      await service.from('market_events').delete().eq('id', data.id);
      throw new Error(`Failed to freeze start prices: ${freezeError.message}`);
    }
  }

  return { id: data.id as string };
}
