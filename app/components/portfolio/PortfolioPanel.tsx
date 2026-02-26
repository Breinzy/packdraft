'use client';

import BudgetGauge from './BudgetGauge';
import BestFitSuggestion from './BestFitSuggestion';
import { formatCurrency, formatPct } from '@/lib/utils';
import {
  BUDGET,
  SET_COLORS,
  TYPE_ICONS,
  type ProductWithPrice,
  type PortfolioItemWithProduct,
} from '@/types';

interface PortfolioPanelProps {
  items: PortfolioItemWithProduct[];
  products: ProductWithPrice[];
  portfolioValue: number;
  cashRemaining: number;
  totalSlots: number;
  isLocked: boolean;
  onRemove: (productId: string) => void;
  onLock: () => void;
}

export default function PortfolioPanel({
  items,
  products,
  portfolioValue,
  cashRemaining,
  totalSlots,
  isLocked,
  onRemove,
  onLock,
}: PortfolioPanelProps) {
  const weightedChange =
    items.length > 0
      ? items.reduce(
          (sum, item) => sum + item.product.change_7d * item.product.price * item.quantity,
          0
        ) / portfolioValue
      : 0;

  return (
    <div className="w-full md:w-80 flex flex-col bg-white/[0.01]">
      <BudgetGauge
        portfolioValue={portfolioValue}
        cashRemaining={cashRemaining}
        totalSlots={totalSlots}
      />

      {items.length > 0 && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="text-xs text-slate-600 tracking-widest mb-1.5">
            PROJECTED RETURN (7D AVG)
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold"
              style={{ color: weightedChange >= 0 ? '#34d399' : '#f87171' }}
            >
              {formatPct(weightedChange)}
            </span>
            <span className="text-sm text-slate-600">
              ≈ {formatCurrency(portfolioValue * weightedChange / 100)}
            </span>
          </div>
          <div className="text-xs text-slate-700 mt-0.5">
            Based on trailing 7d · not a guarantee
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {items.length === 0 ? (
          <div className="px-8 py-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-sm text-slate-700 leading-relaxed tracking-wider">
              YOUR PORTFOLIO IS EMPTY
              <br />
              <span className="text-slate-500">Add products from the market</span>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const allocationPct = ((item.product.price * item.quantity) / BUDGET) * 100;
            const setColor = SET_COLORS[item.product.set_name] || '#94a3b8';
            const icon = TYPE_ICONS[item.product.type] || '📦';
            const isGraded = item.product.category === 'graded';

            return (
              <div
                key={item.product_id}
                className="mx-3 mb-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] px-3 py-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">
                      {isGraded ? (
                        <>
                          <span
                            className="text-[10px] font-bold tracking-wider mr-1.5 px-1.5 py-0.5 rounded"
                            style={{
                              color: item.product.psa_grade === 10 ? '#fbbf24' : '#94a3b8',
                              background: item.product.psa_grade === 10 ? 'rgba(251,191,36,0.15)' : 'rgba(148,163,184,0.15)',
                            }}
                          >
                            PSA {item.product.psa_grade}
                          </span>
                          {item.product.card_name ?? item.product.name}
                        </>
                      ) : (
                        <>{icon} {item.product.name}</>
                      )}
                    </div>
                    <div
                      className="text-xs mt-0.5 opacity-70"
                      style={{ color: setColor }}
                    >
                      {item.product.set_name}
                    </div>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => onRemove(item.product_id)}
                      className="bg-transparent border-none text-slate-600 cursor-pointer text-base pl-2 leading-none font-mono hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-slate-400">
                      {formatCurrency(item.product.price)} × {item.quantity}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                  <span
                    className="text-xs"
                    style={{
                      color: item.product.change_7d >= 0 ? '#34d399' : '#f87171',
                    }}
                  >
                    {formatPct(item.product.change_7d)}
                  </span>
                </div>
                <div className="mt-2 h-0.5 bg-white/[0.04] rounded-sm">
                  <div
                    className="h-full rounded-sm transition-all duration-300"
                    style={{
                      width: `${Math.min(allocationPct, 100)}%`,
                      background: `${setColor}88`,
                    }}
                  />
                </div>
                <div className="text-xs text-slate-700 mt-1">
                  {allocationPct.toFixed(1)}% of budget
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isLocked && cashRemaining > 0 && items.length > 0 && (
        <BestFitSuggestion cashRemaining={cashRemaining} products={products} />
      )}

      <div className="p-3 border-t border-white/[0.06]">
        <button
          disabled={items.length === 0 || isLocked}
          onClick={onLock}
          className="w-full py-3.5 rounded-lg text-sm font-bold tracking-widest font-mono transition-all"
          style={{
            background:
              items.length > 0 && !isLocked
                ? 'linear-gradient(135deg, #5b89bf, #4a78ae)'
                : 'rgba(255,255,255,0.04)',
            border:
              items.length > 0 && !isLocked
                ? '1px solid rgba(110,155,207,0.4)'
                : '1px solid rgba(255,255,255,0.06)',
            color: items.length > 0 && !isLocked ? '#fff' : '#334155',
            cursor: items.length > 0 && !isLocked ? 'pointer' : 'not-allowed',
            boxShadow:
              items.length > 0 && !isLocked
                ? '0 0 24px rgba(110,155,207,0.18)'
                : 'none',
          }}
        >
          {isLocked
            ? 'PORTFOLIO LOCKED ✓'
            : items.length === 0
            ? 'BUILD YOUR PORTFOLIO'
            : `LOCK IN PORTFOLIO · ${totalSlots} PICK${totalSlots !== 1 ? 'S' : ''}`}
        </button>
        {!isLocked && (
          <div className="text-xs text-slate-700 text-center mt-2 tracking-wider">
            Locking is final — no changes after lock
          </div>
        )}
      </div>
    </div>
  );
}
