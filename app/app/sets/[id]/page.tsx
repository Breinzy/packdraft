import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import AssetCard from '@/components/market/AssetCard';
import { getSet, searchCatalog } from '@/lib/market/catalog';
import { tryCreateServerClient } from '@/lib/supabase/server';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import { MARKET_PATH, SETS_PATH } from '@/lib/product/paths';

export const dynamic = 'force-dynamic';

export default async function SetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? '1') || 1;
  const supabase = await tryCreateServerClient();

  if (!supabase) {
    return (
      <AppShell>
        <main className="page py-6 md:py-8 space-y-6">
          <NeedsDatabase feature="Pokémon sets" />
        </main>
      </AppShell>
    );
  }

  let set;
  let catalog;
  try {
    [set, catalog] = await Promise.all([
      getSet(supabase, id),
      searchCatalog(supabase, { setId: id, page }),
    ]);
  } catch {
    return (
      <AppShell>
        <main className="page py-6 md:py-8 space-y-6">
          <QueryFailed feature="this set" />
        </main>
      </AppShell>
    );
  }

  if (!set) notFound();

  return (
    <AppShell>
      <main className="page py-6 md:py-8 space-y-6">
        <Link href={SETS_PATH} className="text-sm text-muted min-h-11 inline-flex items-center">
          ← Sets
        </Link>
        <div>
          <h1 className="page-title text-2xl">{set.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {set.asset_count ? `${set.asset_count} products in the catalog.` : 'Products in this expansion.'}{' '}
            <Link href={`${MARKET_PATH}?set=${set.id}`} className="text-accent-light">
              Open in market
            </Link>
          </p>
        </div>

        {catalog.assets.length === 0 ? (
          <div className="panel p-6 text-sm text-muted">No active products in this set yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {catalog.assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}

        {catalog.total > catalog.pageSize ? (
          <div className="flex items-center justify-between text-sm text-muted">
            {page > 1 ? (
              <Link href={`${SETS_PATH}/${set.id}?page=${page - 1}`} className="min-h-11 inline-flex items-center">
                ← Prev
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} · {catalog.total} assets
            </span>
            {page * catalog.pageSize < catalog.total ? (
              <Link href={`${SETS_PATH}/${set.id}?page=${page + 1}`} className="min-h-11 inline-flex items-center">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
