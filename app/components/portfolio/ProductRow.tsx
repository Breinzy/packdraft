'use client';

import { formatCurrency, formatPct } from '@/lib/utils';
import { SET_COLORS, TYPE_ICONS, type ProductWithPrice } from '@/types';

interface ProductRowProps {
  product: ProductWithPrice;
  heldQty: number;
  canAdd: boolean;
  isAnimating: boolean;
  onAdd: () => void;
}

export default function ProductRow({
  product,
  heldQty,
  canAdd,
  isAnimating,
  onAdd,
}: ProductRowProps) {
  const setColor = SET_COLORS[product.set_name] || '#94a3b8';
  const icon = TYPE_ICONS[product.type] || '📦';

  return (
    <div
      className="grid items-center border-b border-white/[0.03] px-4 py-2 transition-colors hover:bg-white/[0.02]"
      style={{
        gridTemplateColumns: '1fr 80px 80px 70px 44px',
        background: isAnimating
          ? 'rgba(124,58,237,0.1)'
          : heldQty > 0
          ? 'rgba(124,58,237,0.04)'
          : undefined,
      }}
    >
      {/* Product info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-sm border"
            style={{
              background: `linear-gradient(135deg, ${setColor}22, ${setColor}44)`,
              borderColor: `${setColor}33`,
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-200 truncate">{product.name}</div>
            <div className="text-[10px] mt-0.5">
              <span style={{ color: setColor, opacity: 0.8 }}>{product.set_name}</span>
              {heldQty > 0 && (
                <span className="text-purple-500 ml-1.5">× {heldQty} held</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-right text-xs font-semibold text-white">
        {formatCurrency(product.price)}
      </div>

      {/* 7d change */}
      <div
        className="text-right text-xs font-semibold"
        style={{ color: product.change_7d >= 0 ? '#34d399' : '#f87171' }}
      >
        {formatPct(product.change_7d)}
      </div>

      {/* Volume */}
      <div className="text-right text-[10px] text-slate-600">
        {product.volume.toLocaleString()}
      </div>

      {/* Add button */}
      <div className="text-right">
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className="w-7 h-7 rounded flex items-center justify-center text-base font-mono transition-all border"
          style={{
            background: canAdd ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
            borderColor: canAdd ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)',
            color: canAdd ? '#a78bfa' : '#334155',
            cursor: canAdd ? 'pointer' : 'not-allowed',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
