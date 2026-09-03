import AppShell from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { SetsView } from "@/components/collector/sets-view";
import { listSets } from "@/lib/market/catalog";
import { tryCreateServerClient } from "@/lib/supabase/server";
import NeedsDatabase, { QueryFailed } from "@/components/ui/NeedsDatabase";

export const dynamic = "force-dynamic";

export default async function SetsPage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell>
        <PageHeader title="Sets" subtitle="Browse Pokémon expansions and their catalog products." />
        <NeedsDatabase feature="Pokémon sets" />
      </AppShell>
    );
  }

  let sets;
  try {
    sets = await listSets(supabase);
  } catch {
    return (
      <AppShell>
        <PageHeader title="Sets" subtitle="Browse Pokémon expansions and their catalog products." />
        <QueryFailed feature="Pokémon sets" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Sets" subtitle="Browse Pokémon expansions and their catalog products." />
      <SetsView sets={sets} />
    </AppShell>
  );
}
