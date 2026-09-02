'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketEventAsset, MarketEventType } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function EventTicket({
  eventId,
  type,
  assets,
  existing,
  open,
}: {
  eventId: string;
  type: MarketEventType;
  assets: MarketEventAsset[];
  existing: Record<string, unknown> | null;
  open: boolean;
}) {
  const router = useRouter();
  const defaultAsset = String(existing?.asset_id ?? existing?.assetId ?? assets[0]?.asset_id ?? '');
  const [assetId, setAssetId] = useState(defaultAsset);
  const [direction, setDirection] = useState<'up' | 'down'>(
    existing?.direction === 'down' ? 'down' : 'up'
  );
  const [predicted, setPredicted] = useState(
    String(existing?.predicted_price ?? existing?.predictedPrice ?? '')
  );
  const storedRank = Array.isArray(existing?.asset_ids)
    ? (existing?.asset_ids as string[])
    : Array.isArray(existing?.assetIds)
      ? (existing?.assetIds as string[])
      : assets.map((a) => a.asset_id);
  const [order, setOrder] = useState<string[]>(
    storedRank.filter((id) => assets.some((a) => a.asset_id === id))
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const rankedAssets = useMemo(() => {
    const byId = new Map(assets.map((a) => [a.asset_id, a]));
    const ids = order.length === assets.length ? order : assets.map((a) => a.asset_id);
    return ids.map((id) => byId.get(id)).filter(Boolean) as MarketEventAsset[];
  }, [assets, order]);

  function move(index: number, delta: number) {
    const next = [...rankedAssets.map((a) => a.asset_id)];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    setOrder(next);
  }

  async function submit() {
    setError('');
    setNotice('');
    if (!open) {
      setError('Event is not open for entries');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = { eventId };
      if (type === 'release_price') {
        body.assetId = assetId;
        body.predictedPrice = Number(predicted);
      } else if (type === 'direction') {
        body.assetId = assetId;
        body.direction = direction;
      } else if (type === 'biggest_mover') {
        body.assetId = assetId;
      } else {
        body.assetIds = rankedAssets.map((a) => a.asset_id);
      }

      const res = await fetch('/api/events/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=/events/${eventId}`);
          return;
        }
        setError(data.error ?? 'Could not submit');
        return;
      }
      setNotice('Prediction saved. You can change it until the event locks.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel p-4 md:p-5 space-y-4">
      <div className="section-title">Your prediction</div>
      {!open ? (
        <p className="text-sm text-muted">Entries are closed.</p>
      ) : null}

      {type === 'ranking' ? (
        <ol className="space-y-2">
          {rankedAssets.map((row, index) => (
            <li key={row.asset_id} className="flex items-center gap-2">
              <span className="num text-sm text-gold w-6 shrink-0">{index + 1}</span>
              <span className="flex-1 text-sm truncate">{row.asset?.name ?? row.asset_id}</span>
              <button type="button" className="btn btn-ghost min-h-11 px-3" onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" className="btn btn-ghost min-h-11 px-3" onClick={() => move(index, 1)}>
                Down
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <label className="kicker block">
          Asset
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="field mt-1">
            {assets.map((row) => (
              <option key={row.asset_id} value={row.asset_id}>
                {row.asset?.name ?? row.asset_id}
                {row.start_price != null ? ` · start ${formatCurrency(row.start_price)}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {type === 'direction' ? (
        <div className="grid grid-cols-2 gap-2">
          {(['up', 'down'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => setDirection(dir)}
              className={`btn min-h-12 ${direction === dir ? 'btn-primary' : 'btn-ghost'}`}
            >
              {dir === 'up' ? 'Up' : 'Down'}
            </button>
          ))}
        </div>
      ) : null}

      {type === 'release_price' ? (
        <label className="kicker block">
          Predicted price
          <input
            value={predicted}
            onChange={(e) => setPredicted(e.target.value)}
            inputMode="decimal"
            className="field mt-1"
            placeholder="0.00"
          />
        </label>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={loading || !open}
        className="btn btn-primary w-full md:w-auto min-h-12"
      >
        {loading ? 'Saving…' : existing ? 'Update prediction' : 'Submit prediction'}
      </button>
      {error ? <p className="text-sm text-red">{error}</p> : null}
      {notice ? <p className="text-sm text-green">{notice}</p> : null}
    </div>
  );
}
