import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron';
import { createServiceClient } from '@/lib/supabase/service';
import { syncMarketPrices } from '@/lib/market/sync';

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncMarketPrices(createServiceClient());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
