"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { SidebarNav } from "@/components/layout/sidebar";
import type { RankSummary } from "@/lib/auth/use-account-chrome";
import type { SessionUser } from "@/lib/auth/use-session";

export function MobileDrawer({
  open,
  onClose,
  user,
  rank,
}: {
  open: boolean;
  onClose: () => void;
  user: SessionUser | null;
  rank: RankSummary;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/55 transition-opacity duration-[var(--duration)] ${
          open ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-border bg-background shadow-[var(--shadow-lg)] transition-transform duration-[var(--duration)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <button
          type="button"
          className="icon-btn absolute right-3 top-4 z-10"
          aria-label="Close menu"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <SidebarNav user={user} rank={rank} onNavigate={onClose} />
      </aside>
    </div>
  );
}
