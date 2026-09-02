'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseQuantity, previewBuy, previewSell, TradeError } from '@/lib/portfolio/engine';
import { formatCurrency } from '@/lib/utils';

interface TradeTicketProps {
  assetId: string;
  assetName: string;
  bookName: string;
  price: number;
  stale: boolean;
  cash: number;
  ownedQty: number;
  tradingOpen: boolean;
  submitPath: string;
  extraBody?: Record<string, unknown>;
  loginNext: string;
  closedMessage?: string;
}

export default function TradeTicket({
  assetId,
  assetName,
  bookName,
  price,
  stale,
  cash,
  ownedQty,
  tradingOpen,
  submitPath,
  extraBody,
  loginNext,
  closedMessage,
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
      const res = await fetch(submitPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, side, quantity, ...extraBody }),
      });
      const data = (await res.json()) as { error?: string; execution_price?: number; total_value?: number };
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=${encodeURIComponent(loginNext)}`);
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
      <div className="panel">
        <div className="section-title mb-2">Trade</div>
        <p className="text-sm text-muted">{closedMessage ?? `Trading is closed for ${bookName}.`}</p>
      </div>
    );
  }

  return (
    <div className="panel space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="section-title">Trade</div>
          <div className="text-sm text-muted truncate">{bookName}</div>
        </div>
        {stale ? <span className="kicker text-gold">Quote stale</span> : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['buy', 'sell'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`min-h-12 rounded-[var(--radius-md)] text-sm font-semibold border ${
              side === s
                ? s === 'buy'
                  ? 'btn-buy'
                  : 'btn-sell'
                : 'border-border bg-transparent text-faint'
            }`}
          >
            {s === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      <label className="block">
        <div className="kicker mb-1">Quantity</div>
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={qtyRaw}
            onChange={(e) => setQtyRaw(e.target.value.replace(/[^\d]/g, ''))}
            className="field flex-1 num"
          />
          <button type="button" onClick={setMax} className="btn btn-ghost">
            Max
          </button>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="kicker">Price</div>
          <div className="num text-foreground">{formatCurrency(price)}</div>
        </div>
        <div>
          <div className="kicker">{side === 'buy' ? 'Cost' : 'Proceeds'}</div>
          <div className="num text-foreground">{preview ? formatCurrency(preview.total) : '—'}</div>
        </div>
        <div>
          <div className="kicker">{side === 'buy' ? 'Cash after' : 'Owned'}</div>
          <div className="num text-foreground">
            {side === 'buy' ? (preview ? formatCurrency(preview.remainingCash) : '—') : `${ownedQty}`}
          </div>
        </div>
        <div>
          <div className="kicker">Cash</div>
          <div className="num text-foreground">{formatCurrency(cash)}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={loading || !preview || ('ok' in preview && !preview.ok)}
        className={`btn w-full min-h-12 text-base ${side === 'buy' ? 'btn-buy' : 'btn-sell'}`}
      >
        {loading ? 'Working…' : side === 'buy' ? 'Buy' : 'Sell'}
      </button>
      {error ? <p className="text-sm text-red">{error}</p> : null}
      {notice ? <p className="text-sm text-green">{notice}</p> : null}
    </div>
  );
}
