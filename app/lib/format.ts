export function formatUSD(n: number, opts?: { compact?: boolean; cents?: boolean }): string {
  const { compact, cents } = opts ?? {}
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n)
}

export function formatPct(n: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign === false ? '' : n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatSignedUSD(n: number, opts?: { compact?: boolean }): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}${formatUSD(Math.abs(n), { compact: opts?.compact, cents: !opts?.compact })}`
}

export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function validDate(iso: string): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(iso: string): string {
  const date = validDate(iso)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(iso: string): string {
  const date = validDate(iso)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function displayChange(asset: { change24h: number; change7d: number }): number {
  return asset.change24h !== 0 ? asset.change24h : asset.change7d
}

export function trendClass(n: number): string {
  return n > 0 ? 'text-positive' : n < 0 ? 'text-negative' : 'text-muted-foreground'
}
