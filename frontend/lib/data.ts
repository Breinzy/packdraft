// Packdraft mock market + collection data.
// All series are generated from deterministic seeds so server and client render identically.

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
  /** 180-point daily price series, oldest -> newest */
  history: number[]
  grades?: GradeQuote[]
}

export interface PokeSet {
  id: string
  name: string
  code: string
  releasedAt: string
  cardCount: number
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

// ---------- deterministic helpers ----------

function seeded(seedStr: string) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

/** Generates a realistic-looking price walk that lands on `end`. */
function makeHistory(seed: string, end: number, points = 180, drift = 0.35): number[] {
  const rand = seeded(seed)
  const start = end * (1 - drift * (rand() - 0.35))
  const out: number[] = []
  let v = start
  for (let i = 0; i < points; i++) {
    const noise = (rand() - 0.5) * end * 0.03
    const pull = ((end - v) / points) * (i / points) * 6
    v = Math.max(end * 0.35, v + noise + pull)
    out.push(Number(v.toFixed(2)))
  }
  out[out.length - 1] = end
  return out
}

// ---------- sets ----------

export const sets: PokeSet[] = [
  { id: 'pre', name: 'Prismatic Evolutions', code: 'PRE', releasedAt: '2025-01-17', cardCount: 180, logoColor: 'oklch(0.7 0.15 300)', price: 0, change30d: 12.4 },
  { id: 'dri', name: 'Destined Rivals', code: 'DRI', releasedAt: '2025-05-30', cardCount: 244, logoColor: 'oklch(0.68 0.19 18)', price: 0, change30d: 8.1 },
  { id: 'ssp', name: 'Surging Sparks', code: 'SSP', releasedAt: '2024-11-08', cardCount: 252, logoColor: 'oklch(0.82 0.14 78)', price: 0, change30d: 4.6 },
  { id: 'scr', name: 'Stellar Crown', code: 'SCR', releasedAt: '2024-09-13', cardCount: 175, logoColor: 'oklch(0.74 0.16 158)', price: 0, change30d: -2.3 },
  { id: 'mew', name: '151', code: 'MEW', releasedAt: '2023-09-22', cardCount: 207, logoColor: 'oklch(0.68 0.19 18)', price: 0, change30d: 6.9 },
  { id: 'twm', name: 'Twilight Masquerade', code: 'TWM', releasedAt: '2024-05-24', cardCount: 226, logoColor: 'oklch(0.62 0.187 254)', price: 0, change30d: -1.4 },
  { id: 'paf', name: 'Paldean Fates', code: 'PAF', releasedAt: '2024-01-26', cardCount: 245, logoColor: 'oklch(0.82 0.14 78)', price: 0, change30d: 3.2 },
  { id: 'obf', name: 'Obsidian Flames', code: 'OBF', releasedAt: '2023-08-11', cardCount: 230, logoColor: 'oklch(0.68 0.19 18)', price: 0, change30d: 1.1 },
].map((s) => {
  const price = Number((seeded(s.id + 'setidx')() * 400 + 120).toFixed(2))
  return { ...s, price, history: makeHistory(s.id + 'set', price, 180, 0.5) }
})

// ---------- assets ----------

interface AssetSeed {
  id: string
  type: AssetType
  name: string
  subtitle: string
  setId: string
  tag: string
  energy: EnergyType
  price: number
  change24h: number
  change7d: number
  change30d: number
  graded?: boolean
}

const assetSeeds: AssetSeed[] = [
  // --- Prismatic Evolutions ---
  { id: 'umbreon-ex-161', type: 'card', name: 'Umbreon ex', subtitle: '161/131', setId: 'pre', tag: 'Special Illustration Rare', energy: 'darkness', price: 1420, change24h: 2.4, change7d: 6.8, change30d: 18.2, graded: true },
  { id: 'sylveon-ex-156', type: 'card', name: 'Sylveon ex', subtitle: '156/131', setId: 'pre', tag: 'Special Illustration Rare', energy: 'psychic', price: 268, change24h: -1.1, change7d: 3.2, change30d: 9.4, graded: true },
  { id: 'espeon-ex-155', type: 'card', name: 'Espeon ex', subtitle: '155/131', setId: 'pre', tag: 'Special Illustration Rare', energy: 'psychic', price: 214, change24h: 0.8, change7d: -2.1, change30d: 7.7, graded: true },
  { id: 'leafeon-ex-144', type: 'card', name: 'Leafeon ex', subtitle: '144/131', setId: 'pre', tag: 'Ultra Rare', energy: 'grass', price: 62, change24h: 1.4, change7d: 2.9, change30d: 5.1 },
  // --- Surging Sparks ---
  { id: 'pikachu-ex-238', type: 'card', name: 'Pikachu ex', subtitle: '238/191', setId: 'ssp', tag: 'Special Illustration Rare', energy: 'lightning', price: 396, change24h: 3.6, change7d: 8.4, change30d: 14.9, graded: true },
  { id: 'milotic-ex-215', type: 'card', name: 'Milotic ex', subtitle: '215/191', setId: 'ssp', tag: 'Special Illustration Rare', energy: 'water', price: 84, change24h: -0.6, change7d: 1.2, change30d: -3.4 },
  // --- 151 ---
  { id: 'charizard-ex-199', type: 'card', name: 'Charizard ex', subtitle: '199/165', setId: 'mew', tag: 'Special Illustration Rare', energy: 'fire', price: 512, change24h: 1.9, change7d: 4.1, change30d: 11.3, graded: true },
  { id: 'mew-ex-151', type: 'card', name: 'Mew ex', subtitle: '151/165', setId: 'mew', tag: 'Special Illustration Rare', energy: 'psychic', price: 178, change24h: 0.4, change7d: -1.8, change30d: 4.2, graded: true },
  { id: 'venusaur-ex-198', type: 'card', name: 'Venusaur ex', subtitle: '198/165', setId: 'mew', tag: 'Special Illustration Rare', energy: 'grass', price: 96, change24h: -2.2, change7d: -3.9, change30d: -6.1 },
  // --- Stellar Crown ---
  { id: 'latias-ex-171', type: 'card', name: 'Latias ex', subtitle: '171/142', setId: 'scr', tag: 'Special Illustration Rare', energy: 'dragon', price: 142, change24h: 2.1, change7d: 5.6, change30d: 8.8 },
  { id: 'terapagos-ex-170', type: 'card', name: 'Terapagos ex', subtitle: '170/142', setId: 'scr', tag: 'Special Illustration Rare', energy: 'colorless', price: 88, change24h: -1.3, change7d: -0.9, change30d: 2.4 },
  // --- Destined Rivals ---
  { id: 'ethans-typhlosion-206', type: 'card', name: "Ethan's Typhlosion", subtitle: '206/182', setId: 'dri', tag: 'Special Illustration Rare', energy: 'fire', price: 74, change24h: 4.8, change7d: 12.2, change30d: 21.6 },
  { id: 'teams-rocket-mewtwo-198', type: 'card', name: "Team Rocket's Mewtwo ex", subtitle: '198/182', setId: 'dri', tag: 'Special Illustration Rare', energy: 'psychic', price: 118, change24h: 2.7, change7d: 6.1, change30d: 15.4 },
  // --- Paldean Fates ---
  { id: 'mew-ex-232-paf', type: 'card', name: 'Mew ex', subtitle: '232/091', setId: 'paf', tag: 'Special Illustration Rare', energy: 'psychic', price: 156, change24h: 0.9, change7d: 2.3, change30d: 4.9, graded: true },

  // ---------- Sealed ----------
  { id: 'pre-booster-box', type: 'sealed', name: 'Prismatic Evolutions Booster Box', subtitle: '36 packs', setId: 'pre', tag: 'Booster Box', energy: 'psychic', price: 549, change24h: 1.8, change7d: 7.4, change30d: 24.1 },
  { id: 'pre-etb', type: 'sealed', name: 'Prismatic Evolutions Elite Trainer Box', subtitle: '9 packs', setId: 'pre', tag: 'Elite Trainer Box', energy: 'psychic', price: 118, change24h: 2.2, change7d: 5.1, change30d: 16.8 },
  { id: 'pre-booster-bundle', type: 'sealed', name: 'Prismatic Evolutions Booster Bundle', subtitle: '6 packs', setId: 'pre', tag: 'Booster Bundle', energy: 'psychic', price: 74, change24h: 1.1, change7d: 3.8, change30d: 12.2 },
  { id: 'dri-booster-box', type: 'sealed', name: 'Destined Rivals Booster Box', subtitle: '36 packs', setId: 'dri', tag: 'Booster Box', energy: 'darkness', price: 132, change24h: -0.9, change7d: 2.1, change30d: 6.4 },
  { id: 'ssp-booster-box', type: 'sealed', name: 'Surging Sparks Booster Box', subtitle: '36 packs', setId: 'ssp', tag: 'Booster Box', energy: 'lightning', price: 128, change24h: 0.6, change7d: 1.4, change30d: 3.8 },
  { id: 'mew-upc', type: 'sealed', name: '151 Ultra Premium Collection', subtitle: 'UPC', setId: 'mew', tag: 'Ultra Premium Collection', energy: 'fire', price: 214, change24h: 1.4, change7d: 4.6, change30d: 13.1 },
  { id: 'mew-etb', type: 'sealed', name: '151 Elite Trainer Box', subtitle: '9 packs', setId: 'mew', tag: 'Elite Trainer Box', energy: 'fire', price: 96, change24h: 0.7, change7d: 2.2, change30d: 8.4 },
  { id: 'scr-booster-box', type: 'sealed', name: 'Stellar Crown Booster Box', subtitle: '36 packs', setId: 'scr', tag: 'Booster Box', energy: 'colorless', price: 118, change24h: -1.6, change7d: -2.8, change30d: -5.2 },
]

function buildGrades(seed: string, raw: number): GradeQuote[] {
  const r = seeded(seed + 'grade')
  const psa10 = Number((raw * (2.4 + r() * 1.6)).toFixed(2))
  const psa9 = Number((raw * (1.35 + r() * 0.4)).toFixed(2))
  const psa8 = Number((raw * (1.05 + r() * 0.2)).toFixed(2))
  return [
    { grade: 'raw', label: 'Raw / Ungraded', price: raw, change: 0 },
    { grade: 'psa10', label: 'PSA 10', price: psa10, change: Number((r() * 8 - 1).toFixed(1)) },
    { grade: 'psa9', label: 'PSA 9', price: psa9, change: Number((r() * 6 - 2).toFixed(1)) },
    { grade: 'psa8', label: 'PSA 8', price: psa8, change: Number((r() * 5 - 3).toFixed(1)) },
  ]
}

export const assets: Asset[] = assetSeeds.map((s) => {
  const set = sets.find((x) => x.id === s.setId)!
  const r = seeded(s.id + 'meta')
  return {
    id: s.id,
    type: s.type,
    name: s.name,
    subtitle: s.subtitle,
    setId: s.setId,
    setName: set.name,
    tag: s.tag,
    energy: s.energy,
    price: s.price,
    change24h: s.change24h,
    change7d: s.change7d,
    change30d: s.change30d,
    volume: Math.round(r() * 1800 + 60),
    watchers: Math.round(r() * 9000 + 200),
    releasedAt: set.releasedAt,
    history: makeHistory(s.id, s.price, 180, 0.45),
    grades: s.graded ? buildGrades(s.id, s.price) : undefined,
  }
})

// roll set index prices up from member assets already handled via seed; keep as-is.

// ---------- lookups ----------

const assetById = new Map(assets.map((a) => [a.id, a]))
const setById = new Map(sets.map((s) => [s.id, s]))

export function getAsset(id: string): Asset | undefined {
  return assetById.get(id)
}
export function getSet(id: string): PokeSet | undefined {
  return setById.get(id)
}
export function assetsInSet(setId: string): Asset[] {
  return assets.filter((a) => a.setId === setId)
}
export function relatedAssets(asset: Asset, limit = 4): Asset[] {
  return assets
    .filter((a) => a.id !== asset.id && (a.setId === asset.setId || a.energy === asset.energy))
    .slice(0, limit)
}

// ---------- portfolio (owned positions) ----------

export const positions: Position[] = [
  { assetId: 'umbreon-ex-161', quantity: 1, costBasisPerUnit: 1180, purchaseDate: '2025-02-04', grade: 'psa10' },
  { assetId: 'charizard-ex-199', quantity: 2, costBasisPerUnit: 430, purchaseDate: '2024-08-19', grade: 'raw' },
  { assetId: 'pikachu-ex-238', quantity: 1, costBasisPerUnit: 305, purchaseDate: '2024-12-01', grade: 'raw' },
  { assetId: 'pre-booster-box', quantity: 3, costBasisPerUnit: 412, purchaseDate: '2025-01-18' },
  { assetId: 'mew-upc', quantity: 2, costBasisPerUnit: 165, purchaseDate: '2024-06-22' },
  { assetId: 'sylveon-ex-156', quantity: 1, costBasisPerUnit: 240, purchaseDate: '2025-01-30' },
  { assetId: 'pre-etb', quantity: 4, costBasisPerUnit: 74, purchaseDate: '2025-01-19' },
  { assetId: 'latias-ex-171', quantity: 1, costBasisPerUnit: 158, purchaseDate: '2024-09-20' },
  { assetId: 'dri-booster-box', quantity: 2, costBasisPerUnit: 121, purchaseDate: '2025-06-02' },
  { assetId: 'mew-ex-151', quantity: 1, costBasisPerUnit: 205, purchaseDate: '2023-10-14' },
]

export const watchlist: WatchItem[] = [
  { assetId: 'espeon-ex-155', addedAt: '2025-02-10', alertAbove: 260 },
  { assetId: 'ethans-typhlosion-206', addedAt: '2025-06-05', alertBelow: 60 },
  { assetId: 'teams-rocket-mewtwo-198', addedAt: '2025-06-08' },
  { assetId: 'terapagos-ex-170', addedAt: '2024-10-01', alertAbove: 110 },
  { assetId: 'ssp-booster-box', addedAt: '2024-11-12' },
  { assetId: 'venusaur-ex-198', addedAt: '2024-09-04', alertBelow: 85 },
]

// price for a position considering grade premium
export function positionUnitPrice(p: Position): number {
  const a = assetById.get(p.assetId)
  if (!a) return 0
  if (p.grade && a.grades) {
    return a.grades.find((g) => g.grade === p.grade)?.price ?? a.price
  }
  return a.price
}
