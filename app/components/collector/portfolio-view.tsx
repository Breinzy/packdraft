"use client";

import { Plus, Search } from "lucide-react";
import { formatUSD } from "@/lib/format";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { ChangeBadge, Panel } from "@/components/ui/primitives";

export function PortfolioView() {
  const { openAdd } = useUI();

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Market value" value={formatUSD(0, { cents: true })} />
        <SummaryTile label="Cost basis" value={formatUSD(0, { cents: true })} />
        <SummaryTile
          label="Unrealized gain"
          value="$0.00"
          badge={<ChangeBadge value={0} />}
        />
        <SummaryTile label="Today" value="$0.00" badge={<ChangeBadge value={0} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Panel padded={false} className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-border bg-secondary/60 p-1">
              {(["All", "Singles", "Sealed"] as const).map((tab, index) => (
                <span
                  key={tab}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-sm font-semibold",
                    index === 0 ? "bg-card-elevated text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search className="size-4 text-muted-foreground" />
              <span className="h-9 flex-1 text-sm leading-9 text-muted-foreground">
                Search collection...
              </span>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_100px_120px_120px_100px] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Asset</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Market value</span>
            <span className="text-right">Cost basis</span>
            <span className="text-right">Return</span>
          </div>

          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">No collection positions yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Record quantity, purchase price, and date. Packdraft will mark it to stored market
              prices. Nothing here is invented from Sandbox or tournament books.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" strokeWidth={2.5} /> Add to collection
            </button>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Allocation</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="size-[150px] rounded-full border-[16px] border-border" aria-hidden />
              <div className="w-full space-y-2.5">
                <SideAlloc color="var(--color-primary)" label="Singles" pct={0} value={0} />
                <SideAlloc color="var(--color-warning)" label="Sealed" pct={0} value={0} />
              </div>
            </div>
          </Panel>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" strokeWidth={2.5} /> Add to collection
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="tabular text-xl font-semibold tracking-tight text-foreground">{value}</p>
        {badge}
      </div>
    </div>
  );
}

function SideAlloc({
  color,
  label,
  pct,
  value,
}: {
  color: string;
  label: string;
  pct: number;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 font-medium">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tabular text-muted-foreground">
        {pct.toFixed(0)}% · {formatUSD(value)}
      </span>
    </div>
  );
}
