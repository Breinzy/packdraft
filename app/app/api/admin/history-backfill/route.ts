import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron';
import { createServiceClient } from '@/lib/supabase/service';
import { backfillPriceHistory } from '@/lib/market/history-backfill';

export const maxDuration = 300;

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const supabase = createServiceClient();
    const result = await backfillPriceHistory(supabase, {
      timeBudgetMs: parsePositiveInt(searchParams.get('timeBudgetMs')),
      creditBudget: parsePositiveInt(searchParams.get('creditBudget')),
      delayMs: parsePositiveInt(searchParams.get('throttleMs')),
    });
    return NextResponse.json({ ok: true, job: 'history_backfill', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
