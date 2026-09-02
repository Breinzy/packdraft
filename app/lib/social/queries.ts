import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerRanking } from '@/types';

export interface ActivityRow {
  id: string;
  actor_id: string;
  actor_name: string;
  verb: string;
  object_type: string;
  object_id: string | null;
  summary: string;
  created_at: string;
}

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester_name: string;
}

function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

export async function getPlayerRankings(supabase: SupabaseClient): Promise<PlayerRanking[]> {
  const { data, error } = await supabase.rpc('get_player_rankings');
  if (error) throw new Error(`Failed to load player rankings: ${error.message}`);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    user_id: row.user_id as string,
    display_name: (row.display_name as string) ?? 'Player',
    played: Number(row.played),
    wins: Number(row.wins),
    average_return: asNumber(row.average_return),
    rank: Number(row.rank),
  }));
}

export async function listFeed(supabase: SupabaseClient, limit = 40): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from('activity_events')
    .select('id, actor_id, verb, object_type, object_id, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load feed: ${error.message}`);

  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.actor_id as string))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids);
    for (const profile of profiles ?? []) {
      const display =
        (profile.display_name as string | null) ||
        String(profile.email ?? '').split('@')[0] ||
        'Player';
      names.set(profile.id as string, display);
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    actor_id: row.actor_id as string,
    actor_name: names.get(row.actor_id as string) ?? 'Player',
    verb: row.verb as string,
    object_type: row.object_type as string,
    object_id: (row.object_id as string | null) ?? null,
    summary: row.summary as string,
    created_at: row.created_at as string,
  }));
}

export async function listPendingFriendRequests(
  supabase: SupabaseClient,
  userId: string
): Promise<FriendshipRow[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load friend requests: ${error.message}`);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.requester_id as string))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids);
    for (const profile of profiles ?? []) {
      names.set(
        profile.id as string,
        (profile.display_name as string | null) ||
          String(profile.email ?? '').split('@')[0] ||
          'Player'
      );
    }
  }
  return rows.map((row) => ({
    id: row.id as string,
    requester_id: row.requester_id as string,
    addressee_id: row.addressee_id as string,
    status: row.status as FriendshipRow['status'],
    created_at: row.created_at as string,
    requester_name: names.get(row.requester_id as string) ?? 'Player',
  }));
}

export async function getSocialState(
  supabase: SupabaseClient,
  viewerId: string,
  otherId: string
): Promise<{ following: boolean; friends: boolean; outgoing: boolean; incoming: string | null }> {
  const [{ data: follow }, { data: friendship }] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('followee_id', otherId)
      .maybeSingle(),
    supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(
        `and(requester_id.eq.${viewerId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${viewerId})`
      )
      .maybeSingle(),
  ]);

  const row = friendship as
    | { id: string; requester_id: string; addressee_id: string; status: string }
    | null;
  return {
    following: Boolean(follow),
    friends: row?.status === 'accepted',
    outgoing: row?.status === 'pending' && row.requester_id === viewerId,
    incoming: row?.status === 'pending' && row.addressee_id === viewerId ? row.id : null,
  };
}
