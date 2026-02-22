import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreContest } from '@/lib/contest/scoring';

/**
 * Manual contest scoring trigger.
 * POST /api/score-contest?contestId=xxx
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contestId = searchParams.get('contestId');

  if (!contestId) {
    return NextResponse.json({ error: 'Missing contestId' }, { status: 400 });
  }

  await scoreContest(supabase, contestId);

  return NextResponse.json({ ok: true });
}
