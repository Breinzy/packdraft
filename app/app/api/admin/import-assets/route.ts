import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron';
import { createServiceClient } from '@/lib/supabase/service';
import { importMarketCatalog, type ImportOptions } from '@/lib/market/import';

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const options: ImportOptions = {};
  if (searchParams.has('maxSets')) options.maxSealedPages = Number(searchParams.get('maxSets'));
  if (searchParams.has('maxCards')) options.maxGradedCards = Number(searchParams.get('maxCards'));
  if (searchParams.has('creditBudget')) options.creditBudget = Number(searchParams.get('creditBudget'));
  if (searchParams.has('throttleMs')) options.throttleMs = Number(searchParams.get('throttleMs'));

  try {
    const result = await importMarketCatalog(createServiceClient(), options);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
