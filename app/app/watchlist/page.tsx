import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/empty-state';
import { MARKET_PATH } from '@/lib/product/paths';

export default function WatchlistPage() {
  return (
    <AppShell>
      <main className="page py-6 md:py-8 space-y-6">
        <p className="text-sm text-muted">
          Watchlist is your research queue — assets you want to follow before you buy. Saved watches
          and price alerts are not stored yet.
        </p>
        <EmptyState
          title="Your watchlist is empty"
          description="You will be able to star Pokémon products and set alerts from asset pages. For now, use Market search to research live Packdraft prices."
          action={
            <Link href={MARKET_PATH} className="btn btn-primary min-h-11">
              Find assets
            </Link>
          }
        />
      </main>
    </AppShell>
  );
}
