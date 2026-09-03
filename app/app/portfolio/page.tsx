import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/empty-state';
import { MARKET_PATH, SANDBOX_PATH } from '@/lib/product/paths';

export default function PortfolioPage() {
  return (
    <AppShell>
      <main className="page py-6 md:py-8 space-y-6">
        <section className="panel-elevated p-5 md:p-6">
          <p className="label-caps">Your collection</p>
          <p className="metric mt-2">—</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            This is where Packdraft will track the Pokémon you actually own: quantity, purchase
            price, purchase date, cost basis, and live value. That ledger is not built yet, so
            nothing here is invented from Sandbox or tournament books.
          </p>
        </section>

        <EmptyState
          title="No collection positions yet"
          description="You will be able to add cards and sealed products without paying. Until then, research live prices or practice with virtual cash in Sandbox."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={MARKET_PATH} className="btn btn-primary min-h-11">
                Browse market
              </Link>
              <Link href={SANDBOX_PATH} className="btn btn-ghost min-h-11">
                Open sandbox
              </Link>
            </div>
          }
        />
      </main>
    </AppShell>
  );
}
