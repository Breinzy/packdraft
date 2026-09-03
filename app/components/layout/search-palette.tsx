'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { useUI } from '@/lib/ui';
import { formatCurrency } from '@/lib/utils';
import { ASSET_TYPE_LABELS, type AssetType } from '@/types';

type SearchHit = {
  id: string;
  name: string;
  href: string;
  kind: 'asset' | 'set';
  meta: string;
  price: number | null;
};

const POPULAR = ['Charizard', 'Umbreon', 'Elite Trainer Box', 'Prismatic Evolutions'];

export function SearchPalette() {
  const { searchOpen, closeSearch } = useUI();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    setQuery('');
    setHits([]);
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!searchOpen) return;
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        if (!res.ok) {
          setHits([]);
          return;
        }
        const data = (await res.json()) as {
          assets?: { id: string; name: string; asset_type?: AssetType; set_name?: string | null; price?: number | null }[];
          sets?: { id: string; name: string; asset_count?: number }[];
        };
        const setResults: SearchHit[] = (data.sets ?? []).map((set) => ({
          id: set.id,
          name: set.name,
          href: `/sets/${set.id}`,
          kind: 'set',
          meta: set.asset_count ? `${set.asset_count} products` : 'Pokémon set',
          price: null,
        }));
        const assetHits: SearchHit[] = (data.assets ?? []).map((asset) => ({
          id: asset.id,
          name: asset.name,
          href: `/assets/${asset.id}`,
          kind: 'asset',
          meta: [asset.asset_type ? ASSET_TYPE_LABELS[asset.asset_type] : null, asset.set_name]
            .filter(Boolean)
            .join(' · '),
          price: asset.price ?? null,
        }));
        setHits([...setResults, ...assetHits]);
        setActive(0);
      } catch (err) {
        if ((err as { name?: string }).name !== 'AbortError') setHits([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [query, searchOpen]);

  function go(hit: SearchHit) {
    closeSearch();
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && hits[active]) {
      go(hits[active]);
    }
  }

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]">
      <button
        type="button"
        aria-label="Close search"
        onClick={closeSearch}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search catalog"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Icon name="search" className="h-5 w-5 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search Pokémon cards, sealed products, sets..."
            className="h-14 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={closeSearch}
            className="icon-btn !h-7 !w-7"
            aria-label="Close"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {query.trim().length >= 2 && !loading && hits.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No results for “{query.trim()}”</p>
              <p className="mt-1 text-xs text-muted">Try a Pokémon name, set, or product type.</p>
            </div>
          ) : null}

          {query.trim().length < 2 ? (
            <div className="space-y-3 p-2">
              <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-faint">Popular</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-border-strong"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {hits.map((hit, i) => (
            <button
              key={`${hit.kind}-${hit.id}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(hit)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left ${
                active === i ? 'bg-surface-2' : 'hover:bg-surface-2/60'
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-xs font-bold text-accent-light">
                {hit.kind === 'set' ? 'SET' : 'PKM'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{hit.name}</span>
                <span className="block truncate text-xs text-muted">{hit.meta}</span>
              </span>
              {hit.price != null ? (
                <span className="num hidden text-sm font-semibold text-foreground sm:inline">
                  {formatCurrency(hit.price)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
