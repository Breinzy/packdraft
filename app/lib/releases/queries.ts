import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReleaseCampaign } from '@/types';
import { createTournament } from '@/lib/tournament/admin';
import { createMarketEvent, pickPricedAssets } from '@/lib/events/queries';

export async function listReleaseCampaigns(
  supabase: SupabaseClient
): Promise<ReleaseCampaign[]> {
  const { data, error } = await supabase
    .from('release_campaigns')
    .select('*')
    .order('starts_at', { ascending: false });
  if (error) throw new Error(`Failed to load release campaigns: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    set_id: (row.set_id as string | null) ?? null,
    starts_at: row.starts_at as string,
    ends_at: row.ends_at as string,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
  }));
}

export async function getReleaseCampaign(
  supabase: SupabaseClient,
  id: string
): Promise<(ReleaseCampaign & { items: { kind: string; target_id: string }[] }) | null> {
  const { data, error } = await supabase.from('release_campaigns').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load campaign: ${error.message}`);
  if (!data) return null;
  const { data: items, error: itemError } = await supabase
    .from('release_campaign_items')
    .select('kind, target_id, sort_order')
    .eq('campaign_id', id)
    .order('sort_order', { ascending: true });
  if (itemError) throw new Error(`Failed to load campaign items: ${itemError.message}`);
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string) ?? '',
    set_id: (data.set_id as string | null) ?? null,
    starts_at: data.starts_at as string,
    ends_at: data.ends_at as string,
    created_by: (data.created_by as string | null) ?? null,
    created_at: data.created_at as string,
    items: (items ?? []).map((row) => ({
      kind: row.kind as string,
      target_id: row.target_id as string,
    })),
  };
}

async function assetsInSet(service: SupabaseClient, setId: string, count: number): Promise<string[]> {
  const { data, error } = await service
    .from('assets')
    .select('id')
    .eq('set_id', setId)
    .eq('active', true)
    .limit(count);
  if (error) throw new Error(`Failed to pick set assets: ${error.message}`);
  const fromSet = (data ?? []).map((row) => row.id as string);
  if (fromSet.length >= count) return fromSet;
  const extra = await pickPricedAssets(service, count);
  return [...new Set([...fromSet, ...extra])].slice(0, count);
}

export async function createReleaseWeekend(
  service: SupabaseClient,
  input: { name: string; description?: string; setId: string; createdBy: string }
): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new Error('Campaign name is required');
  if (!input.setId) throw new Error('Set is required');

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const assetIds = await assetsInSet(service, input.setId, 5);

  const tournament = await createTournament(service, {
    name: `${name} tournament`,
    description: 'Release-weekend portfolio. Virtual cash. Isolated book.',
    startingBudget: 10000,
    durationDays: 7,
    createdBy: input.createdBy,
    hostKind: 'admin',
    visibility: 'public',
  });

  const direction = await createMarketEvent(service, {
    name: `${name} direction`,
    description: 'Will these assets finish up or down vs open?',
    type: 'direction',
    assetIds: assetIds.slice(0, Math.min(4, assetIds.length)),
    createdBy: input.createdBy,
  });
  const ranking = await createMarketEvent(service, {
    name: `${name} ranking`,
    description: 'Rank these assets by percent move.',
    type: 'ranking',
    assetIds: assetIds.slice(0, Math.max(3, Math.min(5, assetIds.length))),
    createdBy: input.createdBy,
  });
  const mover = await createMarketEvent(service, {
    name: `${name} biggest mover`,
    description: 'Pick the largest percent move.',
    type: 'biggest_mover',
    assetIds: assetIds.slice(0, Math.min(4, assetIds.length)),
    createdBy: input.createdBy,
  });

  const { data, error } = await service
    .from('release_campaigns')
    .insert({
      name,
      description: input.description?.trim() ?? 'Release weekend. Free to play. No real money.',
      set_id: input.setId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to create campaign: ${error?.message ?? 'unknown error'}`);
  }

  const { error: itemError } = await service.from('release_campaign_items').insert([
    { campaign_id: data.id, kind: 'tournament', target_id: tournament.id, sort_order: 0 },
    { campaign_id: data.id, kind: 'event', target_id: direction.id, sort_order: 1 },
    { campaign_id: data.id, kind: 'event', target_id: ranking.id, sort_order: 2 },
    { campaign_id: data.id, kind: 'event', target_id: mover.id, sort_order: 3 },
  ]);
  if (itemError) throw new Error(`Failed to attach campaign items: ${itemError.message}`);

  return { id: data.id as string };
}
