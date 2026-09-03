import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { OverviewView } from "@/components/collector/overview";
import { searchCatalog } from "@/lib/market/catalog";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/overview");

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Player";

    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email!,
        display_name: displayName,
        display_name_set: false,
      })
      .select()
      .single();

    profile = created;
  }

  if (profile && !(profile as Profile).display_name_set) {
    redirect("/auth/onboarding");
  }

  const catalog = await searchCatalog(supabase, { page: 1 }).catch(() => null);
  const movers = [...(catalog?.assets ?? [])]
    .filter((asset) => asset.change_7d != null)
    .sort((a, b) => Math.abs(b.change_7d ?? 0) - Math.abs(a.change_7d ?? 0))
    .slice(0, 5);

  return (
    <AppShell>
      <PageHeader
        title="Overview"
        subtitle="Your collection, performance, and what's moving in the Pokémon market."
      />
      <OverviewView movers={movers} />
    </AppShell>
  );
}
