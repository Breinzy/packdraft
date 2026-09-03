import Link from "next/link";
import type { CatalogAsset } from "@/types";
import { formatCompactNumber, formatUSD } from "@/lib/format";
import { assetImageSrc } from "@/lib/market/images";
import { cn } from "@/lib/utils";
import AssetThumb from "@/components/market/AssetThumb";
import { ChangeBadge, TypePill } from "@/components/ui/primitives";

export function AssetRow({
  asset,
  rank,
  href,
}: {
  asset: CatalogAsset;
  rank?: number;
  href?: string;
}) {
  return (
    <Link
      href={href ?? `/assets/${asset.id}`}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-card-elevated sm:gap-4 sm:px-3"
    >
      {rank !== undefined ? (
        <span className="tabular hidden w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground sm:block">
          {rank}
        </span>
      ) : null}
      <AssetThumb src={assetImageSrc(asset)} alt={asset.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{asset.name}</span>
          <TypePill type={asset.asset_type} />
        </div>
        <p className="truncate text-xs text-muted-foreground">{asset.set_name ?? "Pokémon TCG"}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="tabular text-sm font-semibold text-foreground">
          {asset.price == null ? "—" : formatUSD(asset.price, { cents: true })}
        </span>
        <ChangeBadge value={asset.change_7d} size="sm" />
      </div>
    </Link>
  );
}

export function AssetCard({
  asset,
  href,
}: {
  asset: CatalogAsset;
  href?: string;
}) {
  return (
    <Link
      href={href ?? `/assets/${asset.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:border-border-strong hover:bg-card-elevated",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <AssetThumb src={assetImageSrc(asset)} alt={asset.name} size="md" />
      </div>
      <div className="mt-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <TypePill type={asset.asset_type} />
          <span className="truncate text-[11px] text-muted-foreground">{asset.set_name ?? "Pokémon TCG"}</span>
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{asset.name}</h3>
        <p className="truncate text-xs text-muted-foreground">
          {asset.condition ?? asset.price_type ?? "Market price"}
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="tabular text-base font-bold text-foreground">
          {asset.price == null ? "—" : formatUSD(asset.price, { cents: true })}
        </span>
        <ChangeBadge value={asset.change_7d} />
      </div>
      {asset.volume != null ? (
        <div className="mt-2 flex items-center gap-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span className="tabular">Vol {formatCompactNumber(asset.volume)}</span>
          <span>7d change</span>
        </div>
      ) : null}
    </Link>
  );
}
