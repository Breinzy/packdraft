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
  hrefFor,
  empty,
}: {
  holdings: HoldingView[];
  hrefFor: (assetId: string) => string;
  empty?: string;
}) {
  if (holdings.length === 0) {
    return (
      <p className="text-sm text-muted">
        {empty ?? 'No holdings yet. Browse the market and buy with your tournament cash.'}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {holdings.map((row) => {
        const pnl =
          row.markPrice == null
            ? null
            : unrealizedPnL(
                { assetId: row.assetId, quantity: row.quantity, averageCost: row.averageCost },
                row.markPrice
              );
        const name = row.asset?.name ?? 'Asset';
        const marketValue = row.markPrice == null ? null : row.quantity * row.markPrice;
        return (
          <li key={row.assetId}>
            <Link href={hrefFor(row.assetId)} className="panel panel-hover flex gap-3 p-3.5 md:p-4">
              <AssetThumb src={row.asset ? assetImageSrc(row.asset) : null} alt={name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{name}</div>
                    <div className="mt-1 text-xs text-muted">
                      {row.quantity} @ {formatCurrency(row.averageCost)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm font-medium text-foreground">
                      {marketValue == null ? '—' : formatCurrency(marketValue)}
                    </div>
                    {pnl ? (
                      <div className={`mt-1 text-xs num ${pnl.amount >= 0 ? 'text-green' : 'text-red'}`}>
                        {formatCurrency(pnl.amount)} ({formatReturn(pnl.pct)})
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted">
                  Mark {row.markPrice == null ? '—' : formatCurrency(row.markPrice)}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
