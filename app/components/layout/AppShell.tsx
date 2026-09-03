"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import { SidebarNav } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SearchPalette } from "@/components/layout/search-palette";
import { AddCollectionModal } from "@/components/layout/add-collection-modal";
import { UIProvider } from "@/lib/ui";
import { useAccountChrome } from "@/lib/auth/use-account-chrome";
import { APP_HOME } from "@/lib/product/paths";

interface AppShellProps {
  children: React.ReactNode;
  nav?: string;
  title?: string;
  subtitle?: string;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const chrome = useAccountChrome();

  return (
    <UIProvider>
      <div className="min-h-dvh bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <SidebarNav user={chrome.user} />
        </aside>

        <div className="lg:pl-64">
          <TopBar homeHref={chrome.user ? APP_HOME : "/"} />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 lg:px-8 lg:pb-12">
            {children}
          </main>
          <BottomNav pathname={pathname} />
        </div>

        <SearchPalette />
        <AddCollectionModal />
      </div>
    </UIProvider>
  );
}
