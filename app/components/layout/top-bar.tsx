"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { formatCurrency } from "@/lib/utils";

export function TopBar({
  title,
  subtitle,
  buyingPower,
  onMenu,
  heading = true,
}: {
  title: string;
  subtitle?: string;
  buyingPower: number | null;
  onMenu: () => void;
  heading?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/assets?q=${encodeURIComponent(q)}` : "/assets");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/86 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 lg:gap-6 lg:px-8 lg:py-4">
        <button
          type="button"
          className="icon-btn lg:hidden"
          aria-label="Open menu"
          onClick={onMenu}
        >
          <Icon name="menu" />
        </button>

        <div className="min-w-0 flex-1 lg:flex-none lg:w-56">
          {heading ? (
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground lg:text-2xl">
              {title}
            </h1>
          ) : (
            <p className="truncate text-lg font-semibold tracking-tight text-foreground lg:text-2xl">
              {title}
            </p>
          )}
          {subtitle ? (
            <p className="mt-0.5 hidden truncate text-sm text-muted sm:block">{subtitle}</p>
          ) : null}
        </div>

        <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block" role="search">
          <label className="sr-only" htmlFor="app-search">
            Search cards and sets
          </label>
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              id="app-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards, sets, players..."
              className="h-11 w-full rounded-full border border-border bg-surface-2 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {buyingPower != null ? (
            <div className="hidden text-right sm:block">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Buying power
              </p>
              <p className="num text-sm font-semibold text-foreground">{formatCurrency(buyingPower)}</p>
            </div>
          ) : null}
          <Link href="/tournaments" className="btn btn-primary !h-10 !px-3.5 text-sm sm:!px-4">
            <Icon name="plus" className="mr-1 hidden h-4 w-4 sm:inline" />
            <span className="hidden sm:inline">Enter tournament</span>
            <span className="sm:hidden">Play</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
