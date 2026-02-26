'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ProductList from './ProductList';
import PortfolioPanel from './PortfolioPanel';
import { createClient } from '@/lib/supabase/client';
import {
  BUDGET,
  MAX_SLOTS,
  MAX_PER_PRODUCT,
  type ProductWithPrice,
  type PortfolioItemWithProduct,
  type Portfolio,
} from '@/types';

interface PortfolioBuilderProps {
  initialProducts: ProductWithPrice[];
  initialPortfolio: Portfolio | null;
  initialItems: PortfolioItemWithProduct[];
  readOnly?: boolean;
}

export default function PortfolioBuilder({
  initialProducts,
  initialPortfolio,
  initialItems,
  readOnly = false,
}: PortfolioBuilderProps) {
  const [products] = useState(initialProducts);
  const [items, setItems] = useState<PortfolioItemWithProduct[]>(initialItems);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(initialPortfolio);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'market' | 'portfolio'>('market');
  const supabase = useRef(createClient()).current;

  const portfolioValue = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const cashRemaining = BUDGET - portfolioValue;
  const totalSlots = items.reduce((sum, item) => sum + item.quantity, 0);
  const isLocked = readOnly || (portfolio?.is_locked ?? false);

  const addProduct = useCallback(
    async (product: ProductWithPrice) => {
      if (isLocked || !portfolio) return;
      if (totalSlots >= MAX_SLOTS) return;
      if (cashRemaining < product.price) return;

      const existing = items.find((i) => i.product_id === product.id);
      if (existing && existing.quantity >= MAX_PER_PRODUCT) return;

      setAnimatingId(product.id);
      setTimeout(() => setAnimatingId(null), 600);

      // Optimistic update
      const prevItems = items;
      const newItems = existing
        ? items.map((i) =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [
            ...items,
            {
              id: crypto.randomUUID(),
              portfolio_id: portfolio.id,
              product_id: product.id,
              quantity: 1,
              price_at_lock: product.price,
              product,
            },
          ];
      setItems(newItems);

      const res = await fetch('/api/portfolio/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId: portfolio.id, productId: product.id }),
      });

      if (!res.ok) {
        setItems(prevItems);
      }
    },
    [items, isLocked, totalSlots, cashRemaining, portfolio]
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      if (isLocked || !portfolio) return;
      const existing = items.find((i) => i.product_id === productId);
      if (!existing) return;

      // Optimistic update
      const prevItems = items;
      const newItems =
        existing.quantity === 1
          ? items.filter((i) => i.product_id !== productId)
          : items.map((i) =>
              i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i
            );
      setItems(newItems);

      const res = await fetch('/api/portfolio/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId: portfolio.id, productId }),
      });

      if (!res.ok) {
        setItems(prevItems);
      }
    },
    [items, isLocked, portfolio]
  );

  const lockPortfolio = useCallback(async () => {
    if (!portfolio || isLocked || items.length === 0) return;
    setSaving(true);

    const res = await fetch('/api/portfolio/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolioId: portfolio.id }),
    });

    if (res.ok) {
      const data = await res.json();
      setPortfolio({ ...portfolio, is_locked: true, submitted_at: data.lockedAt });
    }

    setSaving(false);
  }, [portfolio, isLocked, items]);

  useEffect(() => {
    if (!portfolio) return;
    const channel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'portfolios', filter: `id=eq.${portfolio.id}` },
        (payload) => {
          setPortfolio((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [portfolio, supabase]);

  return (
    <div className="flex flex-col md:flex-row flex-1 h-[calc(100vh-96px)]">
      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-white/[0.06]">
        <button
          onClick={() => setMobileTab('market')}
          className="flex-1 py-3 text-sm font-bold tracking-widest text-center border-b-2 transition-colors"
          style={{
            borderColor: mobileTab === 'market' ? '#6e9bcf' : 'transparent',
            color: mobileTab === 'market' ? '#9fc0e6' : '#475569',
          }}
        >
          MARKET
        </button>
        <button
          onClick={() => setMobileTab('portfolio')}
          className="flex-1 py-3 text-sm font-bold tracking-widest text-center border-b-2 transition-colors relative"
          style={{
            borderColor: mobileTab === 'portfolio' ? '#6e9bcf' : 'transparent',
            color: mobileTab === 'portfolio' ? '#9fc0e6' : '#475569',
          }}
        >
          PORTFOLIO
          {items.length > 0 && (
            <span className="ml-1.5 text-xs bg-accent/20 text-accent-light px-1.5 py-0.5 rounded">
              {totalSlots}
            </span>
          )}
        </button>
      </div>

      {/* Product list - hidden on mobile when portfolio tab active */}
      <div className={`flex-1 ${mobileTab === 'portfolio' ? 'hidden md:flex' : 'flex'} flex-col min-h-0`}>
        <ProductList
          products={products}
          portfolioItems={items}
          cashRemaining={cashRemaining}
          totalSlots={totalSlots}
          maxSlots={MAX_SLOTS}
          animatingId={animatingId}
          onAdd={addProduct}
        />
      </div>

      {/* Portfolio panel - hidden on mobile when market tab active */}
      <div className={`${mobileTab === 'market' ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 min-h-0`}>
        <PortfolioPanel
          items={items}
          products={products}
          portfolioValue={portfolioValue}
          cashRemaining={cashRemaining}
          totalSlots={totalSlots}
          isLocked={isLocked || saving}
          onRemove={removeProduct}
          onLock={lockPortfolio}
        />
      </div>
    </div>
  );
}
