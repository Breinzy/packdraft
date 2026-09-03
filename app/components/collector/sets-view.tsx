import Link from "next/link";
import type { CatalogSet } from "@/lib/market/catalog";
import { formatDate, setAccent, setCode } from "@/lib/format";
import { SETS_PATH } from "@/lib/product/paths";
import { EmptyHint } from "@/components/ui/primitives";

export function SetsView({ sets }: { sets: CatalogSet[] }) {
  if (sets.length === 0) {
    return <EmptyHint>No sets imported yet.</EmptyHint>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sets.map((set) => {
        const color = setAccent(set.name);
        return (
          <Link
            key={set.id}
            href={`${SETS_PATH}/${set.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-border-strong hover:bg-card-elevated"
          >
            <div
              className="relative flex h-28 items-center justify-center overflow-hidden"
              style={{
                background: `radial-gradient(120% 130% at 50% 0%, color-mix(in oklch, ${color} 40%, transparent), var(--card) 70%)`,
              }}
            >
              <span
                className="flex size-14 items-center justify-center rounded-2xl text-lg font-black text-background shadow-lg"
                style={{ background: color }}
              >
                {setCode(set.name)}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="text-base font-bold tracking-tight text-foreground">{set.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {set.release_date ? formatDate(set.release_date) : "Pokémon expansion"}
                {set.asset_count ? ` · ${set.asset_count} products` : ""}
              </p>
              <div className="mt-auto flex items-end justify-between border-t border-border pt-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">In catalog</p>
                  <p className="tabular text-lg font-bold text-foreground">{set.asset_count}</p>
                </div>
                <p className="text-xs text-muted-foreground">Open set</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
