import { NextResponse } from 'next/server';
import { listSets, searchCatalog } from '@/lib/market/catalog';
import { tryCreateServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ assets: [], sets: [] });
  }

  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return NextResponse.json({ assets: [], sets: [], error: 'unavailable' }, { status: 503 });
  }

  try {
    const [catalog, sets] = await Promise.all([
      searchCatalog(supabase, { q, page: 1 }),
      listSets(supabase),
    ]);
    const needle = q.toLowerCase();
    const matchingSets = sets
      .filter((set) => set.name.toLowerCase().includes(needle) || (set.slug ?? '').toLowerCase().includes(needle))
      .slice(0, 4);

    return NextResponse.json({
      assets: catalog.assets.slice(0, 8).map((asset) => ({
        id: asset.id,
        name: asset.name,
        asset_type: asset.asset_type,
        set_name: asset.set_name,
        price: asset.price,
      })),
      sets: matchingSets.map((set) => ({
        id: set.id,
        name: set.name,
        asset_count: set.asset_count,
      })),
    });
  } catch {
    return NextResponse.json({ assets: [], sets: [] }, { status: 500 });
  }
}
