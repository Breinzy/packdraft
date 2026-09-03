'use client'

import { usePathname } from 'next/navigation'
import { PortfolioProvider } from '@/lib/store'
import { UIProvider } from '@/lib/ui'
import { AppShell } from '@/components/app-shell'
import { SearchPalette } from '@/components/search-palette'
import { AddPositionModal } from '@/components/add-position-modal'
import { Toaster } from '@/components/toaster'

function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/auth') || pathname.startsWith('/admin')) {
    return children
  }
  return <AppShell>{children}</AppShell>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <UIProvider>
        <AppFrame>{children}</AppFrame>
        <SearchPalette />
        <AddPositionModal />
        <Toaster />
      </UIProvider>
    </PortfolioProvider>
  )
}
