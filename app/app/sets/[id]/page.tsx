import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { getSet, searchCatalog } from "@/lib/market/catalog";
import { tryCreateServerClient } from "@/lib/supabase/server";
import NeedsDatabase, { QueryFailed } from "@/components/ui/NeedsDatabase";
import { AssetCard } from "@/components/ui/asset-views";
import { EmptyHint, Panel } from "@/components/ui/primitives";
import { formatDate, setAccent, setCode } from "@/lib/format";
import { SETS_PATH } from "@/lib/product/paths";

export const dynamic = "force-dynamic";

export default async function SetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const supabase = await tryCreateServerClient();

  if (!supabase) {
    return (
      <AppShell>
        <NeedsDatabase feature="Pokémon sets" />
      </AppShell>
    );
  }

  let set;
  let catalog;
  try {
    [set, catalog] = await Promise.all([
      getSet(supabase, id),
      searchCatalog(supabase, { setId: id, page }),
    ]);
  } catch {
    return (
      <AppShell>
        <QueryFailed feature="this set" />
      </AppShell>
    );
  }

  if (!set) notFound();

  const color = setAccent(set.name);
  const cards = catalog.assets.filter((asset) => asset.asset_type !== "sealed").length;
  const sealed = catalog.assets.filter((asset) => asset.asset_type === "sealed").length;

  return (
    <AppShell>
      <div className="space-y-5">
        <Link
          href={SETS_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Sets
        </Link>

        <Panel padded={false} className="overflow-hidden">
          <div
            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
            style={{
              background: `radial-gradient(90% 140% at 0% 0%, color-mix(in oklch, ${color} 22%, transparent), transparent 60%)`,
            }}
          >
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-background shadow-lg"
              style={{ background: color }}
            >
              {setCode(set.name)}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Expansion
              </span>
              <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {set.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {set.release_date ? `${formatDate(set.release_date)} · ` : ""}
                {set.asset_count ? `${set.asset_count} products in the catalog` : "Products in this expansion"}
              </p>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatTile label="In catalog" value={String(set.asset_count)} />
          <StatTile label="Cards on this page" value={String(cards)} />
          <StatTile label="Sealed on this page" value={String(sealed)} />
        </div>

        {catalog.assets.length === 0 ? (
          <EmptyHint>No active products in this set yet.</EmptyHint>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {catalog.assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}

        {catalog.total > catalog.pageSize ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {page > 1 ? (
              <Link href={`${SETS_PATH}/${set.id}?page=${page - 1}`} className="inline-flex min-h-11 items-center">
                ← Prev
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} · {catalog.total} assets
            </span>
            {page * catalog.pageSize < catalog.total ? (
              <Link href={`${SETS_PATH}/${set.id}?page=${page + 1}`} className="inline-flex min-h-11 items-center">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
