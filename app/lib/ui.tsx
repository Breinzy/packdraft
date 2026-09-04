'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface Toast {
  id: number
  title: string
  description?: string
  variant?: 'default' | 'positive'
}

interface UIValue {
  searchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
  addOpen: boolean
  addAssetId: string | null
  openAdd: (assetId?: string) => void
  closeAdd: () => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

const UIContext = createContext<UIValue | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addAssetId, setAddAssetId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { ...t, id }])
      setTimeout(() => dismissToast(id), 3600)
    },
    [dismissToast],
  )

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const openAdd = useCallback((assetId?: string) => {
    setAddAssetId(assetId ?? null)
    setAddOpen(true)
  }, [])
  const closeAdd = useCallback(() => setAddOpen(false), [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <UIContext.Provider
      value={{
        searchOpen,
        openSearch,
        closeSearch,
        addOpen,
        addAssetId,
        openAdd,
        closeAdd,
        toasts,
        toast,
        dismissToast,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
