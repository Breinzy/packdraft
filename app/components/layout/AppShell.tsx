'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav, { type BottomNavKey } from '@/components/layout/BottomNav';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { SidebarNav } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { titleForPath } from '@/components/layout/page-titles';
import { useAccountChrome } from '@/lib/auth/use-account-chrome';

interface AppShellProps {
  children: React.ReactNode;
  nav?: BottomNavKey | 'none';
  title?: string;
  subtitle?: string;
}

export default function AppShell({ children, nav, title, subtitle }: AppShellProps) {
  const pathname = usePathname();
  const chrome = useAccountChrome();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const copy = titleForPath(pathname);
  const activeNav = nav ?? 'none';
  const isSectionRoot = pathname.split('/').filter(Boolean).length <= 1;

  return (
    <div className="min-h-dvh bg-background">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-[var(--sidebar-w)] lg:flex-col border-r border-border bg-background">
        <SidebarNav user={chrome.user} rank={chrome.rank} />
      </aside>

      <div className="lg:pl-[var(--sidebar-w)]">
        <TopBar
          title={title ?? copy.title}
          subtitle={subtitle ?? copy.subtitle}
          buyingPower={chrome.buyingPower}
          onMenu={() => setDrawerOpen(true)}
          heading={isSectionRoot}
        />
        <div className={activeNav === 'none' ? '' : 'pb-28 lg:pb-0'}>{children}</div>
        {activeNav !== 'none' ? <BottomNav active={activeNav} /> : null}
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={chrome.user}
        rank={chrome.rank}
      />
    </div>
  );
}
