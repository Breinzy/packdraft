"use client";

import { Icon } from "@/components/icons";
import { useUI } from "@/lib/ui";

export function TopBar({
  title,
  onMenu,
  heading = true,
}: {
  title: string;
  subtitle?: string;
  buyingPower?: number | null;
  onMenu: () => void;
  heading?: boolean;
}) {
  const { openSearch, openAdd } = useUI();
  const TitleTag = heading ? "h1" : "p";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 lg:gap-6 lg:px-8">
        <button
          type="button"
          className="icon-btn lg:hidden"
          aria-label="Open menu"
          onClick={onMenu}
        >
          <Icon name="menu" />
        </button>

        <div className="min-w-0 lg:w-52 lg:flex-none">
          <TitleTag className="truncate text-base font-semibold tracking-tight text-foreground lg:text-lg">
            {title}
          </TitleTag>
        </div>

        <button
          type="button"
          onClick={openSearch}
          className="group hidden h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 text-left text-sm text-muted transition-colors hover:border-border-strong hover:bg-surface-2 md:flex lg:max-w-lg"
        >
          <Icon name="search" className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search cards, sealed, sets...</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:inline-flex">
            <Icon name="command" className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="icon-btn md:hidden"
            aria-label="Search"
            onClick={openSearch}
          >
            <Icon name="search" />
          </button>
          <button type="button" onClick={openAdd} className="btn btn-primary !h-10 gap-1.5 !px-3.5 text-sm">
            <Icon name="plus" className="h-4 w-4" />
            <span className="hidden sm:inline">Add to collection</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
}
