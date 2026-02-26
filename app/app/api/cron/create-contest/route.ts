import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNextContest } from '@/lib/contest/scheduler';

/**
 * Contest creation cron -- runs hourly on Saturdays via Vercel Cron.
 * Ensures the next week's contest exists so registration can open Sunday.
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

  try {
    const result = await createNextContest(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
