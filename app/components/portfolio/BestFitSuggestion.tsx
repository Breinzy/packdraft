'use client';

import { formatCurrency } from '@/lib/utils';
import type { ProductWithPrice } from '@/types';

interface BestFitSuggestionProps {
  cashRemaining: number;
  products: ProductWithPrice[];
}

export default function BestFitSuggestion({
  cashRemaining,
  products,
}: BestFitSuggestionProps) {
  const affordable = products
    .filter((p) => p.price <= cashRemaining)
    .sort((a, b) => b.price - a.price);

  if (affordable.length === 0) return null;

  const best = affordable[0];

  return (
    <div className="mx-3 mb-2 px-3 py-2.5 rounded-md" style={{ background: 'rgba(110,155,207,0.06)', border: '1px solid rgba(110,155,207,0.12)' }}>
      <div className="text-xs text-slate-500 tracking-widest mb-1">BEST FIT</div>
      <div className="text-sm text-slate-300">
        You have <span className="text-green font-semibold">{formatCurrency(cashRemaining)}</span>{' '}
        left — add a{' '}
        <span className="text-accent-light font-semibold">{best.name}</span>?
      </div>
    </div>
  );
}
