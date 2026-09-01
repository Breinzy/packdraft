import Link from 'next/link';
import { assetImageSrc } from '@/lib/market/images';
import { formatCurrency, formatPct } from '@/lib/utils';
import { ASSET_TYPE_LABELS, type CatalogAsset } from '@/types';
import AssetThumb from '@/components/market/AssetThumb';

interface AssetCardProps {
  asset: CatalogAsset;
  href?: string;
}

export default function AssetCard({ asset, href }: AssetCardProps) {
  const src = assetImageSrc(asset);
  const change = asset.change_7d ?? 0;
  const changeColor = change > 0 ? 'text-green' : change < 0 ? 'text-red' : 'text-faint';

  return (
    <Link
      href={href ?? `/assets/${asset.id}`}
      className="panel panel-hover p-3 md:p-4 flex gap-3 min-h-[5.5rem]"
    >
      <AssetThumb src={src} alt={asset.name} />
      <div className="min-w-0 flex-1">
        <div className="kicker mb-1 truncate">
          {ASSET_TYPE_LABELS[asset.asset_type]}
          {asset.set_name ? ` · ${asset.set_name}` : ''}
        </div>
        <div className="text-sm md:text-[0.95rem] text-foreground font-medium truncate">{asset.name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="num text-sm text-foreground">
            {asset.price == null ? '—' : formatCurrency(asset.price)}
          </span>
          {asset.price != null ? <span className={`text-xs num ${changeColor}`}>{formatPct(change)}</span> : null}
          {asset.price == null ? (
            <span className="kicker">No price</span>
          ) : asset.stale ? (
            <span className="kicker text-gold">Stale</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
