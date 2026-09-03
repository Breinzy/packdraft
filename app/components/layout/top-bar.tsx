"use client";

import { Command, Plus, Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useUI } from "@/lib/ui";
import { APP_HOME } from "@/lib/product/paths";

export function TopBar({
  homeHref = APP_HOME,
}: {
  title?: string;
  subtitle?: string;
  buyingPower?: number | null;
  onMenu?: () => void;
  heading?: boolean;
  homeHref?: string;
}) {
  const { openSearch, openAdd } = useUI();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <div className="lg:hidden">
          <Logo href={homeHref} compact />
        </div>

        <button
          type="button"
          onClick={openSearch}
          className="group flex h-10 flex-1 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong hover:bg-card-elevated lg:max-w-md"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">Search cards, sealed, sets...</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
            <Command className="size-2.5" />K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Add to collection</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
}
