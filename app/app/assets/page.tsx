import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import AssetCard from '@/components/market/AssetCard';
import { listSets, searchCatalog } from '@/lib/market/catalog';
import { createClient } from '@/lib/supabase/server';
import type { AssetType } from '@/types';

export const dynamic = 'force-dynamic';

const TYPES: { id: 'all' | AssetType; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'sealed', label: 'SEALED' },
  { id: 'single', label: 'SINGLES' },
  { id: 'graded', label: 'GRADED' },
];

function asType(value: string | undefined): 'all' | AssetType {
  if (value === 'sealed' || value === 'single' || value === 'graded') return value;
  return 'all';
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; set?: string; page?: string; tournament?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const q = sp.q ?? '';
  const assetType = asType(sp.type);
  const setId = sp.set || undefined;
  const page = Number(sp.page ?? '1') || 1;
  const tournament = sp.tournament;

  const [catalog, sets] = await Promise.all([
    searchCatalog(supabase, { q, assetType, setId, page }),
    listSets(supabase),
  ]);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (assetType !== 'all') params.set('type', assetType);
    if (setId) params.set('set', setId);
    if (tournament) params.set('tournament', tournament);
    params.set('page', String(nextPage));
    return `/assets?${params.toString()}`;
  }

  return (
    <AppShell nav="market">
      <main className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-widest text-white">MARKET</h1>
          <p className="text-sm text-slate-500 mt-1 tracking-wider">
            Pokémon prices stored by Packdraft. Virtual trades do not move the real market.
          </p>
        </div>

        <form className="space-y-3" action="/assets" method="get">
          {tournament ? <input type="hidden" name="tournament" value={tournament} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search assets"
            className="w-full min-h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 text-white placeholder:text-slate-600"
          />
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input type="radio" name="type" value={t.id} defaultChecked={assetType === t.id} className="sr-only peer" />
                <span className="inline-flex min-h-11 items-center px-4 rounded-xl border border-white/[0.08] text-xs tracking-widest text-slate-500 peer-checked:text-white peer-checked:border-accent/50 peer-checked:bg-accent-dim">
                  {t.label}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              name="set"
              defaultValue={setId ?? ''}
              className="flex-1 min-h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-slate-300"
            >
              <option value="">All sets</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-5 min-h-11 rounded-xl text-sm font-bold tracking-widest text-white"
              style={{ background: 'linear-gradient(135deg, #5b89bf, #4a78ae)' }}
            >
              FILTER
            </button>
          </div>
        </form>

        {catalog.assets.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-sm text-slate-500 tracking-wider">
            No assets match. Import the catalog from Admin after connecting Supabase.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalog.assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                href={`/assets/${asset.id}${tournament ? `?tournament=${tournament}` : ''}`}
              />
            ))}
          </div>
        )}

        {catalog.total > catalog.pageSize ? (
          <div className="flex items-center justify-between text-sm text-slate-500">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="min-h-11 inline-flex items-center">
                ← PREV
              </Link>
            ) : (
              <span />
            )}
            <span>
              PAGE {page} · {catalog.total} ASSETS
            </span>
            {page * catalog.pageSize < catalog.total ? (
              <Link href={pageHref(page + 1)} className="min-h-11 inline-flex items-center">
                NEXT →
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
