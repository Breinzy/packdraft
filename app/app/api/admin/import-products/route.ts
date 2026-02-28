import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { importAllProducts, type ImportOptions } from '@/lib/pricing/import';

export const maxDuration = 300;

/**
 * Admin import endpoint. Protected by CRON_SECRET.
 *
 * Query params (all optional):
 *   maxSets       - number of most-recent sets to import sealed products from (default 30)
 *   maxCards       - number of top graded cards to import (default 200)
 *   creditBudget   - max credits to consume before stopping (default 5000)
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

  const { searchParams } = new URL(request.url);
  const options: ImportOptions = {};
  if (searchParams.has('maxSets')) options.maxSets = Number(searchParams.get('maxSets'));
  if (searchParams.has('maxCards')) options.maxGradedCards = Number(searchParams.get('maxCards'));
  if (searchParams.has('creditBudget')) options.creditBudget = Number(searchParams.get('creditBudget'));
  if (searchParams.has('throttleMs')) options.throttleMs = Number(searchParams.get('throttleMs'));

  const supabase = createClient(url, key);

  try {
    const result = await importAllProducts(supabase, options);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
