'use client';

import { useState, useCallback, useEffect } from 'react';
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
}

export default function PortfolioBuilder({
  initialProducts,
  initialPortfolio,
  initialItems,
}: PortfolioBuilderProps) {
  const [products] = useState(initialProducts);
  const [items, setItems] = useState<PortfolioItemWithProduct[]>(initialItems);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(initialPortfolio);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const portfolioValue = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const cashRemaining = BUDGET - portfolioValue;
  const totalSlots = items.reduce((sum, item) => sum + item.quantity, 0);
  const isLocked = portfolio?.is_locked ?? false;

  const persistItems = useCallback(
    async (newItems: PortfolioItemWithProduct[]) => {
      if (!portfolio) return;
      const value = newItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      await supabase
        .from('portfolios')
        .update({ cash_remaining: BUDGET - value })
        .eq('id', portfolio.id);

      // Upsert items
      const upsertData = newItems.map((item) => ({
        portfolio_id: portfolio.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_lock: item.product.price,
      }));

      if (upsertData.length > 0) {
        await supabase
          .from('portfolio_items')
          .upsert(upsertData, { onConflict: 'portfolio_id,product_id' });
      }
    },
    [portfolio, supabase]
  );

  const addProduct = useCallback(
    (product: ProductWithPrice) => {
      if (isLocked) return;
      if (totalSlots >= MAX_SLOTS) return;
      if (cashRemaining < product.price) return;

      const existing = items.find((i) => i.product_id === product.id);
      if (existing && existing.quantity >= MAX_PER_PRODUCT) return;

      setAnimatingId(product.id);
      setTimeout(() => setAnimatingId(null), 600);

      const newItems = existing
        ? items.map((i) =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [
            ...items,
            {
              id: crypto.randomUUID(),
              portfolio_id: portfolio?.id ?? '',
              product_id: product.id,
              quantity: 1,
              price_at_lock: product.price,
              product,
            },
          ];

      setItems(newItems);
      persistItems(newItems);
    },
    [items, isLocked, totalSlots, cashRemaining, portfolio, persistItems]
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      if (isLocked) return;
      const existing = items.find((i) => i.product_id === productId);
      if (!existing) return;

      let newItems: PortfolioItemWithProduct[];
      if (existing.quantity === 1) {
        newItems = items.filter((i) => i.product_id !== productId);
        // Delete from DB
        if (portfolio) {
          await supabase
            .from('portfolio_items')
            .delete()
            .eq('portfolio_id', portfolio.id)
            .eq('product_id', productId);
        }
      } else {
        newItems = items.map((i) =>
          i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }

      setItems(newItems);
      persistItems(newItems);
    },
    [items, isLocked, portfolio, supabase, persistItems]
  );

  const lockPortfolio = useCallback(async () => {
    if (!portfolio || isLocked || items.length === 0) return;
    setSaving(true);

    const itemUpdates = items.map((item) => ({
      portfolio_id: portfolio.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_lock: item.product.price,
    }));

    await supabase
      .from('portfolio_items')
      .upsert(itemUpdates, { onConflict: 'portfolio_id,product_id' });

    await supabase
      .from('portfolios')
      .update({
        is_locked: true,
        submitted_at: new Date().toISOString(),
        cash_remaining: cashRemaining,
      })
      .eq('id', portfolio.id);

    setPortfolio({ ...portfolio, is_locked: true, submitted_at: new Date().toISOString() });
    setSaving(false);
  }, [portfolio, isLocked, items, cashRemaining, supabase]);

  // Subscribe to realtime portfolio changes (for lock status updates)
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
    <div className="flex flex-1 h-[calc(100vh-96px)]">
      <ProductList
        products={products}
        portfolioItems={items}
        cashRemaining={cashRemaining}
        totalSlots={totalSlots}
        maxSlots={MAX_SLOTS}
        animatingId={animatingId}
        onAdd={addProduct}
      />
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
  );
}
