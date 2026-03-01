import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scoreContest } from '@/lib/contest/scoring';

/**
 * Manual contest scoring trigger. Protected by CRON_SECRET.
 * POST /api/score-contest?contestId=xxx
 */
export async function POST(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const contestId = searchParams.get('contestId');

  if (!contestId) {
    return NextResponse.json({ error: 'Missing contestId' }, { status: 400 });
  }

  await scoreContest(supabase, contestId);

  return NextResponse.json({ ok: true });
}
