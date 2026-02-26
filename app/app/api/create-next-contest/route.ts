import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNextContest, tickContestStatuses } from '@/lib/contest/scheduler';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  const supabase = createClient(url, key);

  try {
    const transitions = await tickContestStatuses(supabase);
    const result = await createNextContest(supabase);

    return NextResponse.json({
      contestId: result.contestId,
      created: result.created,
      transitions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
