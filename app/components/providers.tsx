'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PortfolioProvider } from '@/lib/store'
import { UIProvider } from '@/lib/ui'
import { AppShell } from '@/components/app-shell'
import { SearchPalette } from '@/components/search-palette'
import { AddPositionModal } from '@/components/add-position-modal'
import { Toaster } from '@/components/toaster'
import {
  ensureAssetDetail,
  ensureCollectorSnapshot,
  ensureSetMembers,
  isAssetLoaded,
  isSetLoaded,
  isSnapshotLoaded,
} from '@/lib/catalog-client'

const CatalogContext = createContext<{ ready: boolean }>({ ready: false })

function skipCatalog(pathname: string): boolean {
  return pathname.startsWith('/auth') || pathname.startsWith('/admin')
}

function routeCatalogNeeds(pathname: string): { setId: string | null; assetId: string | null } {
  const setMatch = pathname.match(/^\/sets\/([^/?#]+)/)
  const assetMatch = pathname.match(/^\/asset\/([^/?#]+)/)
  return {
    setId: setMatch ? decodeURIComponent(setMatch[1]) : null,
    assetId: assetMatch ? decodeURIComponent(assetMatch[1]) : null,
  }
}

function CatalogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const skip = skipCatalog(pathname)
  const { setId, assetId } = routeCatalogNeeds(pathname)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    if (skip) return
    let cancelled = false
    void (async () => {
      await ensureCollectorSnapshot()
      if (setId) await ensureSetMembers(setId)
      if (assetId) await ensureAssetDetail(assetId)
      if (!cancelled) setGeneration((value) => value + 1)
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, skip, setId, assetId])

  const snapshotReady = skip || isSnapshotLoaded() || generation > 0
  const extrasReady =
    skip ||
    (isSnapshotLoaded() &&
      (!setId || isSetLoaded(setId)) &&
      (!assetId || isAssetLoaded(assetId)))

  const value = useMemo(() => ({ ready: snapshotReady && extrasReady }), [snapshotReady, extrasReady])

  if (!snapshotReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading catalog…</p>
      </div>
    )
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

function CatalogGate({ children }: { children: React.ReactNode }) {
  const { ready } = useContext(CatalogContext)
  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading catalog…</p>
      </div>
    )
  }
  return children
}

function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/auth') || pathname.startsWith('/admin')) {
    return children
  }
  return <AppShell>{children}</AppShell>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <PortfolioProvider>
        <UIProvider>
          <AppFrame>
            <CatalogGate>{children}</CatalogGate>
          </AppFrame>
          <SearchPalette />
          <AddPositionModal />
          <Toaster />
        </UIProvider>
      </PortfolioProvider>
    </CatalogProvider>
  )
}
