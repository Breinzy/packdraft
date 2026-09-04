import { NextResponse } from 'next/server';
import { buildSetDetail } from '@/lib/market/collector-snapshot';
import { tryCreateServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ set: null, assets: [] }, { status: 400 });
  }

  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return NextResponse.json({ set: null, assets: [], error: 'unavailable' }, { status: 503 });
  }

  try {
    const detail = await buildSetDetail(supabase, id);
    if (!detail.set) {
      return NextResponse.json(detail, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ set: null, assets: [] }, { status: 500 });
  }
}
