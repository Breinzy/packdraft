'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseQuantity, previewBuy, previewSell, TradeError } from '@/lib/portfolio/engine';
import { formatCurrency } from '@/lib/utils';

interface TradeTicketProps {
  assetId: string;
  assetName: string;
  tournamentId: string;
  tournamentName: string;
  price: number;
  stale: boolean;
  cash: number;
  ownedQty: number;
  tradingOpen: boolean;
}

export default function TradeTicket({
  assetId,
  assetName,
  tournamentId,
  tournamentName,
  price,
  stale,
  cash,
  ownedQty,
  tradingOpen,
}: TradeTicketProps) {
  const router = useRouter();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qtyRaw, setQtyRaw] = useState('1');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    try {
      const qty = parseQuantity(qtyRaw || '0');
      if (side === 'buy') return { ...previewBuy(cash, price, qty), qty };
      return { ...previewSell(ownedQty, price, qty), qty, remainingCash: cash, maxQuantity: ownedQty };
    } catch {
      return null;
    }
  }, [qtyRaw, side, cash, price, ownedQty]);

  async function submit() {
    setError('');
    setNotice('');
    if (!tradingOpen) {
      setError('Trading is closed');
      return;
    }
    try {
      const quantity = parseQuantity(qtyRaw);
      setLoading(true);
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, assetId, side, quantity }),
      });
      const data = (await res.json()) as { error?: string; execution_price?: number; total_value?: number };
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=/assets/${assetId}?tournament=${tournamentId}`);
          return;
        }
        setError(data.error ?? 'Trade failed');
        return;
      }
      setNotice(
        `${side === 'buy' ? 'Bought' : 'Sold'} ${quantity} × ${assetName} at ${formatCurrency(Number(data.execution_price ?? price))}`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof TradeError ? err.message : 'Trade failed');
    } finally {
      setLoading(false);
    }
  }

  function setMax() {
    if (side === 'buy') {
      const max = price > 0 ? Math.floor(cash / price) : 0;
      setQtyRaw(String(Math.max(1, max)));
    } else {
      setQtyRaw(String(Math.max(1, ownedQty)));
    }
  }

  if (!tradingOpen) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
        <div className="text-xs text-slate-600 tracking-widest mb-2">TRADE</div>
        <p className="text-sm text-slate-400">Trading is closed for {tournamentName}.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-600 tracking-widest">TRADE</div>
          <div className="text-sm text-slate-400 tracking-wider truncate">{tournamentName}</div>
        </div>
        {stale ? <span className="text-[10px] text-gold tracking-wider">QUOTE STALE</span> : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['buy', 'sell'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`min-h-11 rounded-xl text-sm font-bold tracking-widest ${
              side === s ? 'text-white' : 'text-slate-500'
            }`}
            style={
              side === s
                ? s === 'buy'
                  ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)' }
                  : { background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)' }
                : { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <label className="block">
        <div className="text-[10px] text-slate-600 tracking-widest mb-1">QUANTITY</div>
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={qtyRaw}
            onChange={(e) => setQtyRaw(e.target.value.replace(/[^\d]/g, ''))}
            className="flex-1 min-h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-white"
          />
          <button
            type="button"
            onClick={setMax}
            className="px-4 min-h-11 rounded-xl border border-white/[0.08] text-xs tracking-widest text-slate-400"
          >
            MAX
          </button>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[10px] text-slate-600 tracking-widest">PRICE</div>
          <div className="text-white">{formatCurrency(price)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-600 tracking-widest">{side === 'buy' ? 'COST' : 'PROCEEDS'}</div>
          <div className="text-white">{preview ? formatCurrency(preview.total) : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-600 tracking-widest">{side === 'buy' ? 'CASH AFTER' : 'OWNED'}</div>
          <div className="text-white">
            {side === 'buy'
              ? preview
                ? formatCurrency(preview.remainingCash)
                : '—'
              : `${ownedQty}`}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-600 tracking-widest">CASH</div>
          <div className="text-white">{formatCurrency(cash)}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={loading || !preview || ('ok' in preview && !preview.ok)}
        className="w-full min-h-14 rounded-2xl text-base font-bold tracking-widest text-white disabled:opacity-40"
        style={{
          background: side === 'buy' ? 'linear-gradient(135deg, #34d399, #059669)' : 'linear-gradient(135deg, #f87171, #b91c1c)',
        }}
      >
        {loading ? 'WORKING…' : side === 'buy' ? 'BUY' : 'SELL'}
      </button>
      {error ? <p className="text-sm text-red">{error}</p> : null}
      {notice ? <p className="text-sm text-green">{notice}</p> : null}
    </div>
  );
}
