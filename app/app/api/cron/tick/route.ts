import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tickContestStatuses } from '@/lib/contest/scheduler';
import { autoLockPortfolios } from '@/lib/contest/autoLock';
import { scoreContest } from '@/lib/contest/scoring';

/**
 * Master lifecycle cron -- runs every 15 minutes via Vercel Cron.
 * Transitions contest statuses, auto-locks portfolios, and scores completed contests.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const results: Record<string, unknown> = {};

  try {
    const transitions = await tickContestStatuses(supabase);
    results.transitions = transitions;

    for (const t of transitions) {
      if (t.from === 'registration' && t.to === 'active') {
        const lockResult = await autoLockPortfolios(supabase, t.contestId);
        results[`autoLock_${t.contestId}`] = lockResult;
      }

      if (t.from === 'active' && t.to === 'complete') {
        try {
          await scoreContest(supabase, t.contestId);
          results[`scored_${t.contestId}`] = true;
        } catch (err) {
          results[`scored_${t.contestId}`] = {
            error: err instanceof Error ? err.message : 'Scoring failed',
          };
        }
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
