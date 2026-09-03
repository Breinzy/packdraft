'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { SidebarNav } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { titleForPath } from '@/components/layout/page-titles';
import { SearchPalette } from '@/components/layout/search-palette';
import { AddCollectionModal } from '@/components/layout/add-collection-modal';
import { UIProvider } from '@/lib/ui';
import { useAccountChrome } from '@/lib/auth/use-account-chrome';

interface AppShellProps {
  children: React.ReactNode;
  nav?: string;
  title?: string;
  subtitle?: string;
}

export default function AppShell({ children, title, subtitle }: AppShellProps) {
  const pathname = usePathname();
  const chrome = useAccountChrome();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const copy = titleForPath(pathname);

  return (
    <UIProvider>
      <div className="min-h-dvh bg-background">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[var(--sidebar-w)] lg:flex-col border-r border-sidebar-border bg-sidebar">
          <SidebarNav user={chrome.user} rank={chrome.rank} />
        </aside>

        <div className="lg:pl-[var(--sidebar-w)]">
          <TopBar
            title={title ?? copy.title}
            subtitle={subtitle ?? copy.subtitle}
            onMenu={() => setDrawerOpen(true)}
          />
          <div className="pb-24 lg:pb-0">{children}</div>
          <BottomNav pathname={pathname} />
        </div>

        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          user={chrome.user}
          rank={chrome.rank}
        />
        <SearchPalette />
        <AddCollectionModal />
      </div>
    </UIProvider>
  );
}
