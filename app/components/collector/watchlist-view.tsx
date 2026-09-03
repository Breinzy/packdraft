"use client";

import { Search, Star } from "lucide-react";
import { useUI } from "@/lib/ui";
import { Panel } from "@/components/ui/primitives";

export function WatchlistView() {
  const { openSearch } = useUI();

  return (
    <Panel className="flex flex-col items-center gap-3 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-warning-muted text-warning">
        <Star className="size-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Your watchlist is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Track assets you&apos;re researching before you buy. Saved watches are not stored yet.
        </p>
      </div>
      <button
        type="button"
        onClick={openSearch}
        className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
      >
        <Search className="size-4" /> Find assets
      </button>
    </Panel>
  );
}
