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
  const isGraded = product.category === 'graded';

  return (
    <>
      {/* Desktop row */}
      <div
        className="hidden md:grid items-center border-b border-white/[0.03] px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
        style={{
          gridTemplateColumns: '1fr 80px 80px 70px 44px',
          background: isAnimating
            ? 'rgba(110,155,207,0.08)'
            : heldQty > 0
            ? 'rgba(110,155,207,0.03)'
            : undefined,
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {isGraded ? (
              <div
                className="h-7 px-2 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold tracking-wider border"
                style={{
                  background: product.psa_grade === 10
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.3))'
                    : 'linear-gradient(135deg, rgba(148,163,184,0.15), rgba(148,163,184,0.3))',
                  borderColor: product.psa_grade === 10 ? '#fbbf2444' : '#94a3b844',
                  color: product.psa_grade === 10 ? '#fbbf24' : '#94a3b8',
                }}
              >
                PSA {product.psa_grade}
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-sm border"
                style={{
                  background: `linear-gradient(135deg, ${setColor}22, ${setColor}44)`,
                  borderColor: `${setColor}33`,
                }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm text-slate-200 truncate">
                {isGraded ? product.card_name ?? product.name : product.name}
              </div>
              <div className="text-xs mt-0.5">
                <span style={{ color: setColor, opacity: 0.8 }}>{product.set_name}</span>
                {isGraded && product.card_number && (
                  <span className="text-slate-600 ml-1.5">#{product.card_number}</span>
                )}
                {heldQty > 0 && (
                  <span style={{ color: '#9fc0e6' }} className="ml-1.5">x {heldQty} held</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right text-sm font-semibold text-white">
          {formatCurrency(product.price)}
        </div>

        <div
          className="text-right text-sm font-semibold"
          style={{ color: product.change_7d >= 0 ? '#34d399' : '#f87171' }}
        >
          {formatPct(product.change_7d)}
        </div>

        <div className="text-right text-xs text-slate-600">
          {product.volume.toLocaleString()}
        </div>

        <div className="text-right">
          <button
            onClick={onAdd}
            disabled={!canAdd}
            className="w-8 h-8 rounded flex items-center justify-center text-lg font-mono border"
            style={{
              background: canAdd ? 'rgba(110,155,207,0.15)' : 'rgba(255,255,255,0.03)',
              borderColor: canAdd ? 'rgba(110,155,207,0.35)' : 'rgba(255,255,255,0.06)',
              color: canAdd ? '#9fc0e6' : '#334155',
              cursor: canAdd ? 'pointer' : 'not-allowed',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Mobile row */}
      <div
        className="md:hidden flex items-center gap-3 border-b border-white/[0.03] px-3 py-3 transition-colors"
        style={{
          background: isAnimating
            ? 'rgba(110,155,207,0.08)'
            : heldQty > 0
            ? 'rgba(110,155,207,0.03)'
            : undefined,
        }}
      >
        {isGraded ? (
          <div
            className="h-7 px-1.5 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold tracking-wider border"
            style={{
              background: product.psa_grade === 10
                ? 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.3))'
                : 'linear-gradient(135deg, rgba(148,163,184,0.15), rgba(148,163,184,0.3))',
              borderColor: product.psa_grade === 10 ? '#fbbf2444' : '#94a3b844',
              color: product.psa_grade === 10 ? '#fbbf24' : '#94a3b8',
            }}
          >
            PSA&nbsp;{product.psa_grade}
          </div>
        ) : (
          <div
            className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-sm border"
            style={{
              background: `linear-gradient(135deg, ${setColor}22, ${setColor}44)`,
              borderColor: `${setColor}33`,
            }}
          >
            {icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-200 truncate">
            {isGraded ? product.card_name ?? product.name : product.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-white">{formatCurrency(product.price)}</span>
            <span
              className="text-xs font-semibold"
              style={{ color: product.change_7d >= 0 ? '#34d399' : '#f87171' }}
            >
              {formatPct(product.change_7d)}
            </span>
            {heldQty > 0 && (
              <span className="text-xs" style={{ color: '#9fc0e6' }}>x{heldQty}</span>
            )}
          </div>
        </div>

        <button
          onClick={onAdd}
          disabled={!canAdd}
          className="w-9 h-9 rounded flex-shrink-0 flex items-center justify-center text-lg font-mono border"
          style={{
            background: canAdd ? 'rgba(110,155,207,0.15)' : 'rgba(255,255,255,0.03)',
            borderColor: canAdd ? 'rgba(110,155,207,0.35)' : 'rgba(255,255,255,0.06)',
            color: canAdd ? '#9fc0e6' : '#334155',
            cursor: canAdd ? 'pointer' : 'not-allowed',
          }}
        >
          +
        </button>
      </div>
    </>
  );
}
