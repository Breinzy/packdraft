'use client';

import Link from 'next/link';
import { useUI } from '@/lib/ui';
import { COLLECTION_PATH, MARKET_PATH, SANDBOX_PATH } from '@/lib/product/paths';

export function AddCollectionModal() {
  const { addOpen, closeAdd } = useUI();
  if (!addOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={closeAdd}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-collection-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-lg)] sm:p-6"
      >
        <p className="label-caps">Collection</p>
        <h2 id="add-collection-title" className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          Real collection tracking is next
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Packdraft will let you record quantity, purchase price, and purchase date for the Pokémon
          you own. That ledger is not live yet, so this button does not create holdings or spend
          virtual cash.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Until then, browse live prices or practice in Sandbox with a separate $1,000 virtual book.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href={MARKET_PATH} onClick={closeAdd} className="btn btn-primary min-h-11 flex-1">
            Browse market
          </Link>
          <Link href={SANDBOX_PATH} onClick={closeAdd} className="btn btn-ghost min-h-11 flex-1">
            Open sandbox
          </Link>
        </div>
        <Link
          href={COLLECTION_PATH}
          onClick={closeAdd}
          className="mt-3 inline-flex min-h-11 items-center text-sm text-muted hover:text-foreground"
        >
          What the portfolio will track →
        </Link>
      </div>
    </div>
  );
}
