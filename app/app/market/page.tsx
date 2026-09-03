import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import AssetCard from '@/components/market/AssetCard';
import { listSets, searchCatalog } from '@/lib/market/catalog';
import { tryCreateServerClient } from '@/lib/supabase/server';
import NeedsDatabase, { QueryFailed } from '@/components/ui/NeedsDatabase';
import type { AssetType } from '@/types';
import { MARKET_PATH, SETS_PATH } from '@/lib/product/paths';

export const dynamic = 'force-dynamic';

const TYPES: { id: 'all' | AssetType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sealed', label: 'Sealed' },
  { id: 'single', label: 'Singles' },
  { id: 'graded', label: 'Graded' },
];

function asType(value: string | undefined): 'all' | AssetType {
  if (value === 'sealed' || value === 'single' || value === 'graded') return value;
  return 'all';
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; set?: string; page?: string; tournament?: string; book?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await tryCreateServerClient();
  const q = sp.q ?? '';
  const assetType = asType(sp.type);
  const setId = sp.set || undefined;
  const page = Number(sp.page ?? '1') || 1;
  const tournament = sp.tournament;
  const book = sp.book === 'career' ? 'career' : undefined;

  if (!supabase) {
    return (
      <AppShell>
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Market</h1>
          <NeedsDatabase feature="The asset catalog" />
        </main>
      </AppShell>
    );
  }

  let catalog;
  let sets;
  try {
    [catalog, sets] = await Promise.all([
      searchCatalog(supabase, { q, assetType, setId, page }),
      listSets(supabase),
    ]);
  } catch {
    return (
      <AppShell>
        <main className="page py-6 md:py-8 space-y-6">
          <h1 className="page-title text-2xl">Market</h1>
          <QueryFailed feature="the asset catalog" />
        </main>
      </AppShell>
    );
  }

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (assetType !== 'all') params.set('type', assetType);
    if (setId) params.set('set', setId);
    if (tournament) params.set('tournament', tournament);
    if (book) params.set('book', book);
    params.set('page', String(nextPage));
    return `${MARKET_PATH}?${params.toString()}`;
  }

  return (
    <AppShell>
      <main className="page py-6 md:py-8 space-y-6">
        <p className="text-sm text-muted">
          Pokémon prices stored by Packdraft. Browsing here does not buy a physical card. Virtual
          trades in Sandbox or a tournament do not move the real market.
        </p>

        <form className="space-y-5" action={MARKET_PATH} method="get">
          {tournament ? <input type="hidden" name="tournament" value={tournament} /> : null}
          {book ? <input type="hidden" name="book" value={book} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search cards, sealed, sets"
            className="field min-h-12"
          />
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input type="radio" name="type" value={t.id} defaultChecked={assetType === t.id} className="sr-only peer" />
                <span className="inline-flex min-h-11 items-center px-3.5 rounded-md border border-border text-sm text-muted peer-checked:text-foreground peer-checked:border-accent/50 peer-checked:bg-accent-dim">
                  {t.label}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <select name="set" defaultValue={setId ?? ''} className="field flex-1">
              <option value="">All sets</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">
              Filter
            </button>
          </div>
        </form>

        {setId ? (
          <Link href={`${SETS_PATH}/${setId}`} className="link-quiet inline-flex min-h-11 items-center">
            View this set →
          </Link>
        ) : (
          <Link href={SETS_PATH} className="link-quiet inline-flex min-h-11 items-center">
            Browse by set →
          </Link>
        )}

        {catalog.assets.length === 0 ? (
          <div className="panel p-6 text-sm text-muted">
            {q || assetType !== 'all' || setId
              ? 'No assets match these filters.'
              : 'No assets in the catalog yet. An admin can import them from /admin.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {catalog.assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                href={
                  tournament
                    ? `/assets/${asset.id}?tournament=${tournament}`
                    : book
                      ? `/assets/${asset.id}?book=career`
                      : `/assets/${asset.id}`
                }
              />
            ))}
          </div>
        )}

        {catalog.total > catalog.pageSize ? (
          <div className="flex items-center justify-between text-sm text-muted">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="min-h-11 inline-flex items-center">
                ← Prev
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} · {catalog.total} assets
            </span>
            {page * catalog.pageSize < catalog.total ? (
              <Link href={pageHref(page + 1)} className="min-h-11 inline-flex items-center">
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
