import { NextResponse } from 'next/server';
import { buildCollectorSnapshot } from '@/lib/market/collector-snapshot';
import { tryCreateServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return NextResponse.json({ assets: [], sets: [], error: 'unavailable' }, { status: 503 });
  }

  try {
    const snapshot = await buildCollectorSnapshot(supabase);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ assets: [], sets: [] }, { status: 500 });
  }
}
