import AppShell from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { MarketView } from "@/components/collector/market-view";
import { listSets, searchCatalog } from "@/lib/market/catalog";
import { tryCreateServerClient } from "@/lib/supabase/server";
import NeedsDatabase, { QueryFailed } from "@/components/ui/NeedsDatabase";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const supabase = await tryCreateServerClient();

  if (!supabase) {
    return (
      <AppShell>
        <PageHeader title="Market" subtitle="Discover and research Pokémon cards, sealed products, and sets." />
        <NeedsDatabase feature="The asset catalog" />
      </AppShell>
    );
  }

  let catalog;
  let sets;
  try {
    [catalog, sets] = await Promise.all([
      searchCatalog(supabase, { page: 1 }),
      listSets(supabase),
    ]);
  } catch {
    return (
      <AppShell>
        <PageHeader title="Market" subtitle="Discover and research Pokémon cards, sealed products, and sets." />
        <QueryFailed feature="the asset catalog" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Market"
        subtitle="Discover and research Pokémon cards, sealed products, and sets."
      />
      <MarketView assets={catalog.assets} sets={sets} />
    </AppShell>
  );
}
