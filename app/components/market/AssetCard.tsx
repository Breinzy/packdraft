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
  const changeColor = change > 0 ? 'text-green' : change < 0 ? 'text-red' : 'text-slate-500';

  return (
    <Link
      href={href ?? `/assets/${asset.id}`}
      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 md:p-4 flex gap-3 min-h-[5.5rem] hover:border-white/20 transition-colors"
    >
      <AssetThumb src={src} alt={asset.name} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-slate-600 tracking-widest mb-1">
          {ASSET_TYPE_LABELS[asset.asset_type]}
          {asset.set_name ? ` · ${asset.set_name}` : ''}
        </div>
        <div className="text-sm md:text-base text-white font-bold tracking-wide truncate">{asset.name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm text-accent-light">
            {asset.price == null ? '—' : formatCurrency(asset.price)}
          </span>
          {asset.price != null && (
            <span className={`text-xs ${changeColor}`}>{formatPct(change)}</span>
          )}
          {asset.stale && <span className="text-[10px] text-gold tracking-wider">STALE</span>}
        </div>
      </div>
    </Link>
  );
}
