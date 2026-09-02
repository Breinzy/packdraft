'use client';

import { useEffect, useState } from 'react';
import { tryCreateBrowserClient } from '@/lib/supabase/client';
import { useSession, type SessionUser } from '@/lib/auth/use-session';

export type RankSummary = {
  rank: number | null;
  percentileLabel: string | null;
};

export function useAccountChrome() {
  const session = useSession();
  const [buyingPower, setBuyingPower] = useState<number | null>(null);
  const [rank, setRank] = useState<RankSummary>({ rank: null, percentileLabel: null });

  useEffect(() => {
    if (!session.user) return;
    const db = tryCreateBrowserClient();
    if (!db) return;
    const client = db;
    const userId = session.user.id;

    async function load() {
      const { data: port } = await client
        .from('career_portfolios')
        .select('cash')
        .eq('user_id', userId)
        .maybeSingle();
      if (port && port.cash != null) setBuyingPower(Number(port.cash));

      const { data: standings, error } = await client.rpc('get_career_standings');
      if (error || !Array.isArray(standings) || standings.length === 0) return;
      const mine = standings.find((row: { user_id?: string }) => row.user_id === userId) as
        | { rank?: number }
        | undefined;
      if (!mine?.rank) return;
      const total = standings.length;
      const percentile = Math.max(1, Math.ceil((Number(mine.rank) / total) * 100));
      setRank({
        rank: Number(mine.rank),
        percentileLabel: percentile <= 50 ? `Top ${percentile}%` : null,
      });
    }

    load();
  }, [session.user]);

  return {
    ready: session.ready,
    user: session.sessionUser as SessionUser | null,
    buyingPower,
    rank,
    signOut: session.signOut,
  };
}
