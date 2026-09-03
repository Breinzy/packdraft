import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { CatalogAsset } from "@/types";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChangeBadge({
  value,
  className,
  size = "sm",
  showIcon = true,
}: {
  value: number | null | undefined;
  className?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}) {
  if (value == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md bg-muted font-semibold tabular text-muted-foreground",
          size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
          className,
        )}
      >
        —
      </span>
    );
  }

  const up = value > 0.005;
  const flat = Math.abs(value) <= 0.005;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md font-semibold tabular",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        flat
          ? "bg-muted text-muted-foreground"
          : up
            ? "bg-positive-muted text-positive"
            : "bg-negative-muted text-negative",
        className,
      )}
    >
      {showIcon && !flat ? <Icon className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={2.5} /> : null}
      {formatPct(value)}
    </span>
  );
}

export function TypePill({ type }: { type: CatalogAsset["asset_type"] | "card" | "set" }) {
  const kind = type === "sealed" ? "sealed" : type === "set" ? "set" : "card";
  const label = kind === "card" ? "Card" : kind === "sealed" ? "Sealed" : "Set";
  const cls =
    kind === "card"
      ? "text-primary bg-primary-muted"
      : kind === "sealed"
        ? "text-warning bg-warning-muted"
        : "text-muted-foreground bg-muted";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", cls)}>
      {label}
    </span>
  );
}

export function SectionHead({
  title,
  action,
  href,
  className,
}: {
  title: string;
  action?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      {action ? (
        href ? (
          <Link
            href={href}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {action}
          </Link>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">{action}</span>
        )
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
