'use client';

import { useState, useMemo } from 'react';
import ProductRow from './ProductRow';
import { PRODUCT_TYPE_LABELS, type ProductWithPrice, type PortfolioItemWithProduct } from '@/types';

type SortKey = 'volume' | 'change' | 'price_asc' | 'price_desc';

interface ProductListProps {
  products: ProductWithPrice[];
  portfolioItems: PortfolioItemWithProduct[];
  cashRemaining: number;
  totalSlots: number;
  maxSlots: number;
  animatingId: string | null;
  onAdd: (product: ProductWithPrice) => void;
}

const TYPE_FILTERS = [
  { key: 'All', label: 'ALL' },
  ...Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => ({
    key,
    label: label.toUpperCase().replace(' ', '\u00A0'),
  })),
];

export default function ProductList({
  products,
  portfolioItems,
  cashRemaining,
  totalSlots,
  maxSlots,
  animatingId,
  onAdd,
}: ProductListProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('volume');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter((p) => filterType === 'All' || p.type === filterType)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.set_name.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sortBy === 'volume') return b.volume - a.volume;
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'change') return b.change_7d - a.change_7d;
        return 0;
      });
  }, [products, search, filterType, sortBy]);

  function getHeldQty(productId: string): number {
    return portfolioItems.find((i) => i.product_id === productId)?.quantity ?? 0;
  }

  return (
    <div className="flex-1 flex flex-col border-r border-border min-w-0">
      {/* Controls */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex gap-2.5 flex-wrap items-center">
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-slate-200 outline-none flex-1 min-w-[140px] font-mono tracking-wider placeholder:text-slate-600 focus:border-accent/40 transition-colors"
        />
        <div className="flex gap-1">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className="px-2.5 py-1 rounded text-[10px] font-mono tracking-wider border transition-all"
              style={{
                borderColor:
                  filterType === t.key
                    ? 'rgba(124,58,237,0.6)'
                    : 'rgba(255,255,255,0.06)',
                background:
                  filterType === t.key ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: filterType === t.key ? '#a78bfa' : '#64748b',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-[11px] text-slate-400 font-mono outline-none cursor-pointer"
        >
          <option value="volume">SORT: VOLUME</option>
          <option value="change">SORT: 7D CHANGE</option>
          <option value="price_asc">SORT: PRICE ↑</option>
          <option value="price_desc">SORT: PRICE ↓</option>
        </select>
      </div>

      {/* Column headers */}
      <div
        className="grid px-4 py-1.5 border-b border-white/[0.04] text-[9px] text-slate-600 tracking-widest"
        style={{ gridTemplateColumns: '1fr 80px 80px 70px 44px' }}
      >
        <span>PRODUCT</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">7D CHG</span>
        <span className="text-right">VOL</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((product) => {
          const heldQty = getHeldQty(product.id);
          const canAfford = cashRemaining >= product.price;
          const slotsAvailable = totalSlots < maxSlots;
          const underProductCap = heldQty < 10;
          const canAdd = canAfford && slotsAvailable && underProductCap;

          return (
            <ProductRow
              key={product.id}
              product={product}
              heldQty={heldQty}
              canAdd={canAdd}
              isAnimating={animatingId === product.id}
              onAdd={() => onAdd(product)}
            />
          );
        })}
      </div>
    </div>
  );
}
