import type { CatalogAsset } from "@/types";
import { formatUSD } from "@/lib/format";
import { COLLECTION_PATH, MARKET_PATH, WATCHLIST_PATH } from "@/lib/product/paths";
import { cn } from "@/lib/utils";
import { AssetRow } from "@/components/ui/asset-views";
import { ChangeBadge, EmptyHint, Panel, SectionHead } from "@/components/ui/primitives";

export function OverviewView({ movers }: { movers: CatalogAsset[] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" padded={false}>
          <div className="flex flex-wrap items-start justify-between gap-4 p-4 pb-0 sm:p-5 sm:pb-0">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Collection value
              </span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="tabular text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {formatUSD(0, { cents: true })}
                </span>
                <ChangeBadge value={0} size="md" />
              </div>
              <p className="tabular mt-1 text-sm font-medium text-muted-foreground">
                $0.00 today
                <span className="text-muted-foreground"> · 0.00%</span>
              </p>
            </div>
          </div>
          <div className="flex h-[240px] flex-col items-center justify-center px-5 text-center">
            <p className="text-sm font-medium text-foreground">No collection history yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add the Pokémon you own and this chart will mark them to live Packdraft prices. This is
              not your Sandbox book.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border p-4 sm:grid-cols-4 sm:p-5">
            <HeroStat label="Cost basis" value={formatUSD(0, { cents: true })} />
            <HeroStat label="Total return" value="$0.00" />
            <HeroStat label="Today" value="$0.00" />
            <HeroStat label="Holdings" value="0" />
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <SectionHead title="Allocation" action="Portfolio" href={COLLECTION_PATH} />
            <div className="flex items-center gap-4">
              <div className="size-32 shrink-0 rounded-full border-[14px] border-border" aria-hidden />
              <div className="flex-1 space-y-3">
                <AllocRow color="var(--color-primary)" label="Singles" pct={0} value={0} />
                <AllocRow color="var(--color-warning)" label="Sealed" pct={0} value={0} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
              <CompCell label="Singles" value="0" />
              <CompCell label="Sealed" value="0" />
              <CompCell label="Sets" value="0" />
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <SectionHead title="Top performers" />
          <EmptyHint>Performers appear after you add collection positions.</EmptyHint>
        </Panel>
        <Panel>
          <SectionHead title="Biggest losers" />
          <EmptyHint>Losers appear after you add collection positions.</EmptyHint>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionHead title="Pokémon market movers" action="Explore market" href={MARKET_PATH} />
          {movers.length === 0 ? (
            <EmptyHint>No catalog prices with a 7-day change yet.</EmptyHint>
          ) : (
            <div className="-mx-1">
              {movers.map((asset, index) => (
                <AssetRow key={asset.id} asset={asset} rank={index + 1} />
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionHead title="Recently added" action="All" href={COLLECTION_PATH} />
            <EmptyHint>Nothing in the collection ledger yet.</EmptyHint>
          </Panel>
          <Panel>
            <SectionHead title="Watchlist activity" action="Watchlist" href={WATCHLIST_PATH} />
            <EmptyHint>Saved watches are not stored yet.</EmptyHint>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CompCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-card py-3">
      <span className="tabular text-lg font-semibold text-foreground">{value}</span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function AllocRow({
  color,
  label,
  pct,
  value,
}: {
  color: string;
  label: string;
  pct: number;
  value: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tabular text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>
      <p className={cn("tabular mt-0.5 pl-[18px] text-xs text-muted-foreground")}>
        {formatUSD(value)}
      </p>
    </div>
  );
}
