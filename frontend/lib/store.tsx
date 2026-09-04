'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  assets,
  getAsset,
  positions as seedPositions,
  watchlist as seedWatch,
  positionUnitPrice,
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

export function buildView(p: Position): PositionView {
  const asset = getAsset(p.assetId)!
  const unitPrice = positionUnitPrice(p)
  const marketValue = unitPrice * p.quantity
  const costBasis = p.costBasisPerUnit * p.quantity
  const gain = marketValue - costBasis
  const returnPct = costBasis > 0 ? (gain / costBasis) * 100 : 0
  return { ...p, asset, unitPrice, marketValue, costBasis, gain, returnPct }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [positions, setPositions] = useState<Position[]>(seedPositions)
  const [watch, setWatch] = useState<WatchItem[]>(seedWatch)

  const positionViews = useMemo(
    () => positions.map(buildView).sort((a, b) => b.marketValue - a.marketValue),
    [positions],
  )

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
    const gradeMult = positionUnitPrice(p) / a.price
    for (let i = 0; i < points; i++) {
      out[i] += (a.history[i] ?? a.price) * gradeMult * p.quantity
    }
  }
  return out.map((n) => Number(n.toFixed(2)))
}

export { assets, type GradeQuote }
