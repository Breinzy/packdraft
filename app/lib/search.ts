import { assets, sets, type Asset, type PokeSet } from '@/lib/data'

export type SearchResult =
  | { kind: 'card' | 'sealed'; asset: Asset }
  | { kind: 'set'; set: PokeSet }

export const POPULAR_SEARCHES = ['Umbreon ex', 'Charizard', 'Prismatic Evolutions', 'Booster Box', 'Pikachu ex', 'ETB']

export function search(query: string, limit = 12): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: { score: number; result: SearchResult }[] = []

  for (const a of assets) {
    const hay = `${a.name} ${a.subtitle} ${a.setName} ${a.tag}`.toLowerCase()
    const idx = hay.indexOf(q)
    if (idx >= 0) {
      const score = (a.name.toLowerCase().startsWith(q) ? 0 : 100) + idx + (a.type === 'card' ? 0 : 1)
      results.push({ score, result: { kind: a.type, asset: a } })
    }
  }
  for (const s of sets) {
    const hay = `${s.name} ${s.code} expansion set`.toLowerCase()
    const idx = hay.indexOf(q)
    if (idx >= 0) {
      const score = (s.name.toLowerCase().startsWith(q) ? 0 : 100) + idx
      results.push({ score, result: { kind: 'set', set: s } })
    }
  }
  return results.sort((a, b) => a.score - b.score).slice(0, limit).map((r) => r.result)
}
