import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketEvent } from '@/types';
import {
  payloadFromStored,
  rankEventScores,
  scoreEventEntry,
  type EventAssetMarks,
} from './scoring';
import { getMarketEvent, getMarketEventAssets, mapMarketEvent } from './queries';

export async function freezeEventPrices(
  service: SupabaseClient,
  eventId: string,
  phase: 'start' | 'end',
  asOf: string
): Promise<void> {
  const { error } = await service.rpc('freeze_market_event_prices', {
    p_event_id: eventId,
    p_phase: phase,
    p_as_of: asOf,
  });
  if (error) throw new Error(error.message);
}

export async function settleMarketEvent(
  service: SupabaseClient,
  eventId: string
): Promise<{ ok: true; already_settled?: boolean; results: number }> {
  const event = await getMarketEvent(service, eventId);
  if (!event) throw new Error('Event not found');
  if (event.status === 'completed' || event.status === 'cancelled') {
    return { ok: true, already_settled: true, results: 0 };
  }
  if (new Date(event.settles_at).getTime() > Date.now() && event.status !== 'settling') {
    throw new Error('Event has not reached settlement time');
  }

  await service.from('market_events').update({ status: 'settling' }).eq('id', eventId);
  await freezeEventPrices(service, eventId, 'end', event.settles_at);

  const assets = await getMarketEventAssets(service, eventId);
  const marks: EventAssetMarks[] = assets.map((row) => ({
    assetId: row.asset_id,
    startPrice: row.start_price,
    endPrice: row.end_price,
  }));
  const allowed = assets.map((row) => row.asset_id);

  const { data: entries, error: entryError } = await service
    .from('market_event_entries')
    .select('user_id, payload, submitted_at')
    .eq('event_id', eventId);
  if (entryError) throw new Error(`Failed to load entries: ${entryError.message}`);

  const scored = [];
  for (const row of entries ?? []) {
    try {
      const payload = payloadFromStored(event.type, row.payload, allowed);
      const result = scoreEventEntry(payload, marks);
      scored.push({
        userId: row.user_id as string,
        submittedAt: row.submitted_at as string,
        score: result.score,
        detail: result.detail,
      });
    } catch {
      scored.push({
        userId: row.user_id as string,
        submittedAt: row.submitted_at as string,
        score: 0,
        detail: { error: 'Invalid payload' },
      });
    }
  }

  const ranked = rankEventScores(scored);
  await service.from('market_event_results').delete().eq('event_id', eventId);
  if (ranked.length > 0) {
    const { error } = await service.from('market_event_results').insert(
      ranked.map((row) => ({
        event_id: eventId,
        user_id: row.userId,
        score: row.score,
        rank: row.rank,
        detail: row.detail,
      }))
    );
    if (error) throw new Error(`Failed to store event results: ${error.message}`);
  }

  await service
    .from('market_events')
    .update({ status: 'completed', settled_at: new Date().toISOString() })
    .eq('id', eventId);

  return { ok: true, results: ranked.length };
}

export async function tickMarketEvents(
  service: SupabaseClient
): Promise<{ ticked: number; settled: number; errors: { event_id: string; error: string }[] }> {
  const { data, error } = await service
    .from('market_events')
    .select('*')
    .in('status', ['upcoming', 'open', 'locked', 'settling']);
  if (error) throw new Error(`Failed to load events: ${error.message}`);

  let ticked = 0;
  let settled = 0;
  const errors: { event_id: string; error: string }[] = [];
  const now = Date.now();

  for (const raw of data ?? []) {
    const stored = mapMarketEvent(raw as Record<string, unknown>);
    const row = raw as Record<string, unknown>;
    const dbStatus = row.status as MarketEvent['status'];
    try {
      let status = dbStatus;
      if (status === 'upcoming' && now >= new Date(stored.opens_at).getTime()) {
        await freezeEventPrices(service, stored.id, 'start', stored.opens_at);
        await service.from('market_events').update({ status: 'open' }).eq('id', stored.id);
        status = 'open';
        ticked += 1;
      }
      if (status === 'open' && now >= new Date(stored.locks_at).getTime()) {
        await service.from('market_events').update({ status: 'locked' }).eq('id', stored.id);
        status = 'locked';
        ticked += 1;
      }
      if (
        (status === 'locked' || status === 'settling') &&
        now >= new Date(stored.settles_at).getTime()
      ) {
        await settleMarketEvent(service, stored.id);
        settled += 1;
      }
    } catch (err) {
      errors.push({
        event_id: stored.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { ticked, settled, errors };
}
