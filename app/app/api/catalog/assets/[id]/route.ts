import { NextResponse } from 'next/server';
import { buildAssetDetail } from '@/lib/market/collector-snapshot';
import { tryCreateServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ asset: null, set: null, related: [] }, { status: 400 });
  }

  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return NextResponse.json({ asset: null, set: null, related: [], error: 'unavailable' }, { status: 503 });
  }

  try {
    const detail = await buildAssetDetail(supabase, id);
    if (!detail.asset) {
      return NextResponse.json(detail, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ asset: null, set: null, related: [] }, { status: 500 });
  }
}
