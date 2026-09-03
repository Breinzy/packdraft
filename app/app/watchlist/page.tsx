import AppShell from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { WatchlistView } from "@/components/collector/watchlist-view";

export default function WatchlistPage() {
  return (
    <AppShell>
      <PageHeader
        title="Watchlist"
        subtitle="Your research queue — assets you're tracking before you buy."
      />
      <WatchlistView />
    </AppShell>
  );
}
