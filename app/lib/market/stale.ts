export const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export function isPriceStale(
  recordedAt: string | Date,
  now: Date = new Date(),
  maxAgeMs: number = STALE_AFTER_MS
): boolean {
  const recorded =
    recordedAt instanceof Date ? recordedAt : new Date(recordedAt);
  if (Number.isNaN(recorded.getTime())) return true;
  return now.getTime() - recorded.getTime() > maxAgeMs;
}

export function computeChangePct(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0;
  }
  return ((current - previous) / previous) * 100;
}
