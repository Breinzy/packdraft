export type AssetType = 'card' | 'sealed'
export type EnergyType =
  | 'lightning'
  | 'psychic'
  | 'fire'
  | 'water'
  | 'grass'
  | 'darkness'
  | 'dragon'
  | 'colorless'

export interface GradeQuote {
  grade: 'raw' | 'psa10' | 'psa9' | 'psa8'
  label: string
  price: number
  change: number
}

export interface Asset {
  id: string
  type: AssetType
  name: string
  /** e.g. card number "161/131" or product qualifier */
  subtitle: string
  setId: string
  setName: string
  /** rarity for cards, product type for sealed */
  tag: string
  energy: EnergyType
  price: number
  change24h: number
  change7d: number
  change30d: number
  volume: number
  watchers: number
  releasedAt: string
  /** Daily close series, oldest -> newest. Only real snapshots; may be a single current price. */
  history: number[]
  grades?: GradeQuote[]
}

export interface PokeSet {
  id: string
  name: string
  code: string
  releasedAt: string
  cardCount: number
  trackedCount: number
  sealedCount: number
  logoColor: string
  price: number
  change30d: number
  history: number[]
}

export interface Position {
  assetId: string
  quantity: number
  costBasisPerUnit: number
  purchaseDate: string
  grade?: GradeQuote['grade']
}

export interface WatchItem {
  assetId: string
  addedAt: string
  alertAbove?: number
  alertBelow?: number
}

/** Mutated in place so mockup components can keep importing these arrays. */
export const assets: Asset[] = []
export const sets: PokeSet[] = []

/** Collection/watchlist have no server ledger yet. Seed empty; the client store may persist locally. */
export const positions: Position[] = []
export const watchlist: WatchItem[] = []

const assetById = new Map<string, Asset>()
const setById = new Map<string, PokeSet>()
let catalogEpoch = 0
const catalogListeners = new Set<() => void>()

function reindex() {
  assetById.clear()
  setById.clear()
  for (const asset of assets) assetById.set(asset.id, asset)
  for (const set of sets) setById.set(set.id, set)
}

function bumpCatalog() {
  catalogEpoch += 1
  for (const listener of catalogListeners) listener()
}

export function getCatalogEpoch(): number {
  return catalogEpoch
}

export function subscribeCatalog(listener: () => void): () => void {
  catalogListeners.add(listener)
  return () => {
    catalogListeners.delete(listener)
  }
}

export function hydrateCatalog(nextAssets: Asset[], nextSets: PokeSet[]): void {
  assets.splice(0, assets.length, ...nextAssets)
  sets.splice(0, sets.length, ...nextSets)
  reindex()
  bumpCatalog()
}

export function mergeAssets(next: Asset[]): void {
  if (next.length === 0) return
  for (const asset of next) {
    const index = assets.findIndex((row) => row.id === asset.id)
    if (index >= 0) {
      const previous = assets[index]
      assets[index] =
        asset.history.length >= previous.history.length
          ? asset
          : { ...asset, history: previous.history }
    } else {
      assets.push(asset)
    }
  }
  reindex()
  bumpCatalog()
}

export function mergeSets(next: PokeSet[], mode: 'replace' | 'fill' = 'fill'): void {
  if (next.length === 0) return
  for (const set of next) {
    const index = sets.findIndex((row) => row.id === set.id)
    if (index >= 0) {
      if (mode === 'fill') continue
      sets[index] = set
    } else {
      sets.push(set)
    }
  }
  reindex()
  bumpCatalog()
}

export function getAsset(id: string): Asset | undefined {
  return assetById.get(id)
}

export function getSet(id: string): PokeSet | undefined {
  return setById.get(id)
}

export function assetsInSet(setId: string): Asset[] {
  return assets.filter((asset) => asset.setId === setId)
}

export function relatedAssets(asset: Asset, limit = 4): Asset[] {
  return assets
    .filter((row) => row.id !== asset.id && (row.setId === asset.setId || row.energy === asset.energy))
    .slice(0, limit)
}

export function positionUnitPrice(p: Position): number {
  const asset = assetById.get(p.assetId)
  if (!asset) return 0
  if (p.grade && asset.grades) {
    return asset.grades.find((quote) => quote.grade === p.grade)?.price ?? asset.price
  }
  return asset.price
}
