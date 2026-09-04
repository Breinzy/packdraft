'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  assets,
  getAsset,
  getCatalogEpoch,
  positions as seedPositions,
  watchlist as seedWatch,
  positionUnitPrice,
  subscribeCatalog,
  type Asset,
  type GradeQuote,
  type Position,
  type WatchItem,
} from '@/lib/data'

export interface PositionView extends Position {
  asset: Asset
  unitPrice: number
  marketValue: number
  costBasis: number
  gain: number
  returnPct: number
}

interface PortfolioTotals {
  value: number
  costBasis: number
  totalReturn: number
  totalReturnPct: number
  todayMove: number
  todayMovePct: number
  singlesValue: number
  sealedValue: number
}

interface StoreValue {
  positions: Position[]
  watch: WatchItem[]
  positionViews: PositionView[]
  totals: PortfolioTotals
  isWatched: (assetId: string) => boolean
  toggleWatch: (assetId: string) => void
  addPosition: (p: Position) => void
  updatePosition: (assetId: string, patch: Partial<Position>) => void
  removePosition: (assetId: string) => void
  ownedFor: (assetId: string) => PositionView | undefined
}

const StoreContext = createContext<StoreValue | null>(null)

const POSITIONS_KEY = 'packdraft.collection.positions'
const WATCH_KEY = 'packdraft.watchlist'

function isPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false
  const row = value as Position
  return (
    typeof row.assetId === 'string' &&
    typeof row.quantity === 'number' &&
    typeof row.costBasisPerUnit === 'number' &&
    typeof row.purchaseDate === 'string'
  )
}

function isWatchItem(value: unknown): value is WatchItem {
  if (!value || typeof value !== 'object') return false
  const row = value as WatchItem
  return typeof row.assetId === 'string' && typeof row.addedAt === 'string'
}

function readLocal<T>(key: string, fallback: T, guard: (value: unknown) => value is T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    if (!guard(parsed)) return fallback
    return parsed
  } catch {
    return fallback
  }
}

function isPositionList(value: unknown): value is Position[] {
  return Array.isArray(value) && value.every(isPosition)
}

function isWatchList(value: unknown): value is WatchItem[] {
  return Array.isArray(value) && value.every(isWatchItem)
}

export function buildView(p: Position): PositionView | null {
  const asset = getAsset(p.assetId)
  if (!asset) return null
  const unitPrice = positionUnitPrice(p)
  const marketValue = unitPrice * p.quantity
  const costBasis = p.costBasisPerUnit * p.quantity
  const gain = marketValue - costBasis
  const returnPct = costBasis > 0 ? (gain / costBasis) * 100 : 0
  return { ...p, asset, unitPrice, marketValue, costBasis, gain, returnPct }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [positions, setPositions] = useState<Position[]>(() =>
    readLocal(POSITIONS_KEY, seedPositions, isPositionList),
  )
  const [watch, setWatch] = useState<WatchItem[]>(() => readLocal(WATCH_KEY, seedWatch, isWatchList))
  const [catalogEpoch, setCatalogEpoch] = useState(getCatalogEpoch)

  useEffect(() => subscribeCatalog(() => setCatalogEpoch(getCatalogEpoch())), [])

  useEffect(() => {
    try {
      window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [positions])

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCH_KEY, JSON.stringify(watch))
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [watch])

  const positionViews = useMemo(() => {
    const views = positions
      .map(buildView)
      .filter((view): view is PositionView => view !== null)
      .sort((a, b) => b.marketValue - a.marketValue)
    return catalogEpoch >= 0 ? views : views
  }, [positions, catalogEpoch])

  const totals = useMemo<PortfolioTotals>(() => {
    let value = 0
    let costBasis = 0
    let todayMove = 0
    let singlesValue = 0
    let sealedValue = 0
    for (const v of positionViews) {
      value += v.marketValue
      costBasis += v.costBasis
      todayMove += v.marketValue * (v.asset.change24h / 100)
      if (v.asset.type === 'card') singlesValue += v.marketValue
      else sealedValue += v.marketValue
    }
    const totalReturn = value - costBasis
    return {
      value,
      costBasis,
      totalReturn,
      totalReturnPct: costBasis > 0 ? (totalReturn / costBasis) * 100 : 0,
      todayMove,
      todayMovePct: value > 0 ? (todayMove / (value - todayMove)) * 100 : 0,
      singlesValue,
      sealedValue,
    }
  }, [positionViews])

  const isWatched = useCallback((assetId: string) => watch.some((w) => w.assetId === assetId), [watch])

  const toggleWatch = useCallback((assetId: string) => {
    setWatch((prev) =>
      prev.some((w) => w.assetId === assetId)
        ? prev.filter((w) => w.assetId !== assetId)
        : [{ assetId, addedAt: new Date().toISOString() }, ...prev],
    )
  }, [])

  const addPosition = useCallback((p: Position) => {
    setPositions((prev) => {
      const existing = prev.find((x) => x.assetId === p.assetId && x.grade === p.grade)
      if (existing) {
        const totalQty = existing.quantity + p.quantity
        const blended =
          (existing.costBasisPerUnit * existing.quantity + p.costBasisPerUnit * p.quantity) / totalQty
        return prev.map((x) =>
          x === existing ? { ...x, quantity: totalQty, costBasisPerUnit: Number(blended.toFixed(2)) } : x,
        )
      }
      return [...prev, p]
    })
  }, [])

  const updatePosition = useCallback((assetId: string, patch: Partial<Position>) => {
    setPositions((prev) => prev.map((x) => (x.assetId === assetId ? { ...x, ...patch } : x)))
  }, [])

  const removePosition = useCallback((assetId: string) => {
    setPositions((prev) => prev.filter((x) => x.assetId !== assetId))
  }, [])

  const ownedFor = useCallback(
    (assetId: string) => positionViews.find((v) => v.assetId === assetId),
    [positionViews],
  )

  const value: StoreValue = {
    positions,
    watch,
    positionViews,
    totals,
    isWatched,
    toggleWatch,
    addPosition,
    updatePosition,
    removePosition,
    ownedFor,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function usePortfolio() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}

/** Blend N price histories weighted by a factor into a single portfolio series. */
export function portfolioValueSeries(positions: Position[], points = 180): number[] {
  const out = new Array(points).fill(0)
  for (const p of positions) {
    const a = getAsset(p.assetId)
    if (!a) continue
    const gradeMult = a.price > 0 ? positionUnitPrice(p) / a.price : 1
    const series = a.history.length > 0 ? a.history : [a.price]
    for (let i = 0; i < points; i++) {
      const histIndex = i - (points - series.length)
      const px = histIndex >= 0 ? series[histIndex] : series[0]
      out[i] += (px ?? a.price) * gradeMult * p.quantity
    }
  }
  return out.map((n) => Number(n.toFixed(2)))
}

export { assets, type GradeQuote }
