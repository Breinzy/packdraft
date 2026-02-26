'use client';

import StatCard from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/utils';
import { BUDGET, MAX_SLOTS, CASH_DECAY_RATE } from '@/types';

interface BudgetGaugeProps {
  portfolioValue: number;
  cashRemaining: number;
  totalSlots: number;
}

export default function BudgetGauge({
  portfolioValue,
  cashRemaining,
  totalSlots,
}: BudgetGaugeProps) {
  const budgetPct = (portfolioValue / BUDGET) * 100;
  const projectedDecay = cashRemaining * CASH_DECAY_RATE;

  return (
    <div className="p-4 border-b border-white/[0.06]">
      <div className="flex justify-between mb-2">
        <span className="text-xs text-slate-600 tracking-widest">BUDGET ALLOCATED</span>
        <span className="text-xs text-slate-400">{budgetPct.toFixed(1)}%</span>
      </div>

      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-400"
          style={{
            width: `${Math.min(budgetPct, 100)}%`,
            background:
              budgetPct > 85
                ? 'linear-gradient(90deg, #6e9bcf, #f87171)'
                : budgetPct > 50
                ? 'linear-gradient(90deg, #6e9bcf, #fbbf24)'
                : 'linear-gradient(90deg, #6e9bcf, #9fc0e6)',
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <StatCard
          label="INVESTED"
          value={formatCurrency(portfolioValue)}
          color="#9fc0e6"
        />
        <StatCard
          label="CASH"
          value={formatCurrency(cashRemaining)}
          color={cashRemaining < 50 ? '#f87171' : '#34d399'}
        />
        <StatCard
          label="PICKS"
          value={`${totalSlots} / ${MAX_SLOTS}`}
          color={totalSlots >= MAX_SLOTS ? '#f87171' : '#60a5fa'}
        />
      </div>

      {cashRemaining > 0 && (
        <div className="mt-2 px-3 py-2 rounded bg-yellow-400/[0.06] border border-yellow-400/[0.15] text-xs text-yellow-800">
          ⚠ {formatCurrency(projectedDecay)} cash decay at contest end
        </div>
      )}
    </div>
  );
}
