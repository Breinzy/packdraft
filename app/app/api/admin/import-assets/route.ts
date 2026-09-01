import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron';
import { createServiceClient } from '@/lib/supabase/service';
import { importMarketCatalog, type ImportOptions } from '@/lib/market/import';
import { runCatalogImportChunk, type CatalogImportOptions } from '@/lib/market/catalog-import';

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
  const mode = searchParams.get('mode') ?? 'catalog';

  try {
    const supabase = createServiceClient();

    if (mode === 'sample') {
      const options: ImportOptions = {};
      if (searchParams.has('maxSets')) options.maxSealedPages = Number(searchParams.get('maxSets'));
      if (searchParams.has('maxCards')) options.maxGradedCards = Number(searchParams.get('maxCards'));
      if (searchParams.has('creditBudget')) options.creditBudget = Number(searchParams.get('creditBudget'));
      if (searchParams.has('throttleMs')) options.throttleMs = Number(searchParams.get('throttleMs'));
      const result = await importMarketCatalog(supabase, options);
      return NextResponse.json({ ok: true, mode: 'sample', ...result });
    }

    const options: CatalogImportOptions = {
      timeBudgetMs: parsePositiveInt(searchParams.get('timeBudgetMs')),
      creditBudget: parsePositiveInt(searchParams.get('creditBudget')),
      requestGapMs: parsePositiveInt(searchParams.get('throttleMs')),
    };
    const result = await runCatalogImportChunk(supabase, options);
    return NextResponse.json({ mode: 'catalog', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
