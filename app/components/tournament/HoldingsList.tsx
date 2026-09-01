import Link from 'next/link';
import { assetImageSrc } from '@/lib/market/images';
import { formatCurrency, formatReturn } from '@/lib/utils';
import { unrealizedPnL } from '@/lib/portfolio/engine';
import type { Asset } from '@/types';
import AssetThumb from '@/components/market/AssetThumb';

export interface HoldingView {
  assetId: string;
  quantity: number;
  averageCost: number;
  markPrice: number | null;
  asset: Asset | null;
}

export default function HoldingsList({
  holdings,
  tournamentId,
}: {
  holdings: HoldingView[];
  tournamentId: string;
}) {
  if (holdings.length === 0) {
    return (
      <p className="text-sm text-muted">
        No holdings yet. Browse the market and buy with your tournament cash.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {holdings.map((row) => {
        const pnl = row.markPrice == null ? null : unrealizedPnL(
          { assetId: row.assetId, quantity: row.quantity, averageCost: row.averageCost },
          row.markPrice
        );
        const name = row.asset?.name ?? 'Asset';
        return (
          <li key={row.assetId}>
            <Link
              href={`/assets/${row.assetId}?tournament=${tournamentId}`}
              className="flex gap-3 panel panel-hover p-3"
            >
              <AssetThumb src={row.asset ? assetImageSrc(row.asset) : null} alt={name} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground font-bold truncate">{name}</div>
                <div className="text-xs text-muted mt-1">
                  {row.quantity} @ {formatCurrency(row.averageCost)}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className="text-accent-light">
                    {row.markPrice == null ? '—' : formatCurrency(row.markPrice)}
                  </span>
                  {pnl ? (
                    <span className={pnl.amount >= 0 ? 'text-green' : 'text-red'}>
                      {formatCurrency(pnl.amount)} ({formatReturn(pnl.pct)})
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
