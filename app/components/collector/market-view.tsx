"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Flame, Search, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { CatalogAsset } from "@/types";
import type { CatalogSet } from "@/lib/market/catalog";
import { formatDate, setAccent, setCode } from "@/lib/format";
import { SETS_PATH } from "@/lib/product/paths";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { AssetCard, AssetRow } from "@/components/ui/asset-views";
import { EmptyHint, Panel, SectionHead } from "@/components/ui/primitives";

type Filter = "all" | "card" | "sealed";

const RAILS = [
  { key: "trending", label: "Trending", icon: Flame },
  { key: "gainers", label: "Top gainers", icon: TrendingUp },
  { key: "losers", label: "Top losers", icon: TrendingDown },
  { key: "watched", label: "Highest volume", icon: Eye },
  { key: "new", label: "Catalog", icon: Sparkles },
] as const;

function isCard(asset: CatalogAsset) {
  return asset.asset_type === "single" || asset.asset_type === "graded";
}

function change(asset: CatalogAsset) {
  return asset.change_7d ?? 0;
}

export function MarketView({
  assets,
  sets,
}: {
  assets: CatalogAsset[];
  sets: CatalogSet[];
}) {
  const { openSearch } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [rail, setRail] = useState<(typeof RAILS)[number]["key"]>("trending");

  const pool = useMemo(
    () =>
      assets.filter((asset) => {
        if (filter === "all") return true;
        if (filter === "sealed") return asset.asset_type === "sealed";
        return isCard(asset);
      }),
    [assets, filter],
  );

  const railAssets = useMemo(() => {
    const arr = [...pool];
    switch (rail) {
      case "gainers":
        return arr.sort((a, b) => change(b) - change(a)).slice(0, 8);
      case "losers":
        return arr.sort((a, b) => change(a) - change(b)).slice(0, 8);
      case "watched":
        return arr.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 8);
      case "new":
        return arr.slice(0, 8);
      default:
        return arr.sort((a, b) => Math.abs(change(b)) - Math.abs(change(a))).slice(0, 8);
    }
  }, [pool, rail]);

  const popular = useMemo(
    () => [...pool].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 6),
    [pool],
  );
  const moving = useMemo(
    () => [...pool].sort((a, b) => Math.abs(change(b)) - Math.abs(change(a))).slice(0, 8),
    [pool],
  );

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={openSearch}
        className="flex h-12 w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong hover:bg-card-elevated"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">
          Search “Charizard”, “Prismatic Evolutions”, “Booster Box”...
        </span>
        <span className="hidden rounded-lg bg-secondary px-2 py-1 text-xs font-semibold sm:inline">
          Search
        </span>
      </button>

      <div className="space-y-3">
        <div className="inline-flex w-fit gap-0.5 rounded-xl border border-border bg-secondary/60 p-1">
          {(["all", "card", "sealed"] as const).map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => setFilter(next)}
              className={cn(
                "min-h-9 rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors",
                filter === next ? "bg-card-elevated text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {next === "card" ? "Cards" : next === "sealed" ? "Sealed" : "All"}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {RAILS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRail(item.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                rail === item.key
                  ? "border-primary/40 bg-primary-muted text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {railAssets.length === 0 ? (
        <EmptyHint>No assets in the catalog yet.</EmptyHint>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {railAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionHead title="Recently moving" />
          {moving.length === 0 ? (
            <EmptyHint>No 7-day movers in this catalog page.</EmptyHint>
          ) : (
            <div className="-mx-1">
              {moving.map((asset, index) => (
                <AssetRow key={asset.id} asset={asset} rank={index + 1} />
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHead title="Popular sets" action="All sets" href={SETS_PATH} />
          <div className="space-y-1">
            {sets.slice(0, 6).map((set) => (
              <Link
                key={set.id}
                href={`${SETS_PATH}/${set.id}`}
                className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-card-elevated"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-background"
                  style={{ background: setAccent(set.name) }}
                >
                  {setCode(set.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{set.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {set.release_date ? formatDate(set.release_date) : "Pokémon set"}
                    {set.asset_count ? ` · ${set.asset_count} products` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {popular.length > 0 ? (
        <div>
          <SectionHead title="From the catalog" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {popular.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
