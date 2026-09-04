'use client'

import { PortfolioProvider } from '@/lib/store'
import { UIProvider } from '@/lib/ui'
import { AppShell } from '@/components/app-shell'
import { SearchPalette } from '@/components/search-palette'
import { AddPositionModal } from '@/components/add-position-modal'
import { Toaster } from '@/components/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <UIProvider>
        <AppShell>{children}</AppShell>
        <SearchPalette />
        <AddPositionModal />
        <Toaster />
      </UIProvider>
    </PortfolioProvider>
  )
}
