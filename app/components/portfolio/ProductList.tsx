'use client';

import { useState, useMemo } from 'react';
import ProductRow from './ProductRow';
import {
  PRODUCT_TYPE_LABELS,
  SEALED_TYPES,
  GRADED_TYPES,
  type ProductWithPrice,
  type PortfolioItemWithProduct,
  type ProductCategory,
  type ProductType,
} from '@/types';

type SortKey = 'volume' | 'change' | 'price_asc' | 'price_desc';
type CategoryFilter = 'all' | ProductCategory;

interface ProductListProps {
  products: ProductWithPrice[];
  portfolioItems: PortfolioItemWithProduct[];
  cashRemaining: number;
  totalSlots: number;
  maxSlots: number;
  animatingId: string | null;
  onAdd: (product: ProductWithPrice) => void;
}

function getTypeFilters(category: CategoryFilter) {
  let types: ProductType[];
  if (category === 'sealed') types = SEALED_TYPES;
  else if (category === 'graded') types = GRADED_TYPES;
  else types = [...SEALED_TYPES, ...GRADED_TYPES];

  return [
    { key: 'All', label: 'ALL' },
    ...types.map((t) => ({
      key: t,
      label: PRODUCT_TYPE_LABELS[t].toUpperCase().replace(' ', '\u00A0'),
    })),
  ];
}

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'sealed', label: 'SEALED' },
  { key: 'graded', label: 'GRADED' },
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
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('volume');

  const typeFilters = useMemo(() => getTypeFilters(category), [category]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter((p) => {
        if (category === 'sealed') return p.category === 'sealed';
        if (category === 'graded') return p.category === 'graded';
        return true;
      })
      .filter((p) => filterType === 'All' || p.type === filterType)
      .filter((p) => {
        const searchName = p.card_name ?? p.name;
        return (
          searchName.toLowerCase().includes(q) ||
          p.set_name.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'volume') return b.volume - a.volume;
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'change') return b.change_7d - a.change_7d;
        return 0;
      });
  }, [products, search, category, filterType, sortBy]);

  function getHeldQty(productId: string): number {
    return portfolioItems.find((i) => i.product_id === productId)?.quantity ?? 0;
  }

  function handleCategoryChange(cat: CategoryFilter) {
    setCategory(cat);
    setFilterType('All');
  }

  return (
    <div className="flex-1 flex flex-col border-r-0 md:border-r border-border min-w-0">
      {/* Category tabs */}
      <div className="px-3 md:px-4 pt-3 pb-0 flex gap-0 border-b border-white/[0.05]">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleCategoryChange(tab.key)}
            className="px-3 md:px-5 py-2.5 text-xs md:text-sm font-mono font-bold tracking-widest border-b-2 transition-all"
            style={{
              borderColor: category === tab.key ? '#6e9bcf' : 'transparent',
              color: category === tab.key ? '#9fc0e6' : '#475569',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-white/[0.05] flex gap-2 md:gap-2.5 flex-wrap items-center">
        <input
          placeholder={category === 'graded' ? 'Search cards...' : 'Search products...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-slate-200 outline-none flex-1 min-w-[120px] font-mono tracking-wider placeholder:text-slate-600 focus:border-accent/40 transition-colors"
        />
        <div className="flex gap-1 overflow-x-auto">
          {typeFilters.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className="px-2.5 md:px-3 py-1.5 rounded text-[10px] md:text-xs font-mono tracking-wider border transition-all whitespace-nowrap"
              style={{
                borderColor:
                  filterType === t.key
                    ? 'rgba(110,155,207,0.5)'
                    : 'rgba(255,255,255,0.06)',
                background:
                  filterType === t.key ? 'rgba(110,155,207,0.12)' : 'transparent',
                color: filterType === t.key ? '#9fc0e6' : '#64748b',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2 md:px-3 py-2 text-xs md:text-sm text-slate-400 font-mono outline-none cursor-pointer"
        >
          <option value="volume">VOLUME</option>
          <option value="change">7D CHG</option>
          <option value="price_asc">PRICE ↑</option>
          <option value="price_desc">PRICE ↓</option>
        </select>
      </div>

      {/* Column headers - hidden on mobile */}
      <div
        className="hidden md:grid px-4 py-2 border-b border-white/[0.04] text-xs text-slate-600 tracking-widest"
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
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-600 tracking-wider">
            NO PRODUCTS FOUND
          </div>
        ) : (
          filtered.map((product) => {
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
          })
        )}
      </div>
    </div>
  );
}
